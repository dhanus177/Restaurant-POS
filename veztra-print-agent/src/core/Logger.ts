import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { getConfigService } from './ConfigService';

class LoggerService {
  private logger!: winston.Logger;
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    const configService = getConfigService();
    const logPath = this.getLogPath();

    // Ensure log directory exists
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const level = configService.getLogLevel();

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
          let log = `${timestamp} [${(level as string).toUpperCase()}] ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      ),
      defaultMeta: { service: 'veztra-print-agent' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message }: any) => {
              return `${timestamp} [${level}] ${message}`;
            })
          )
        }),
        new winston.transports.File({
          filename: logPath,
          maxsize: 10485760, // 10MB
          maxFiles: 10
        })
      ]
    });

    this.initialized = true;
  }

  private getLogPath(): string {
    const configService = getConfigService();
    const platform = require('../services/PlatformService').getPlatformService().getPlatform();

    if (platform === 'windows') {
      const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'VeztraPrintAgent', 'logs', 'service.log');
    } else {
      return '/var/log/veztra-print-agent/service.log';
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any): void {
    this.logger.error(message, error);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  getRecentLogs(lines: number = 100): string[] {
    const logPath = this.getLogPath();
    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    return content.split('\n').slice(-lines).filter(l => l.trim());
  }
}

// Singleton instance
let instance: LoggerService | null = null;

export function getLogger(): LoggerService {
  if (!instance) {
    instance = new LoggerService();
    instance.initialize();
  }
  return instance;
}
