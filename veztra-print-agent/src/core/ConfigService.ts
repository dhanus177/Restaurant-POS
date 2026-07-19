import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getPlatformService } from '../services/PlatformService';

interface AppConfig {
  service: {
    port: number;
    host: string;
    apiVersion: string;
  };
  database: {
    path: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxSize: string;
    maxFiles: number;
  };
  print: {
    defaultRetries: number;
    defaultRetryDelay: number;
    queueCheckInterval: number;
  };
}

class ConfigService {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  private getConfigPath(): string {
    const platformService = getPlatformService();
    const platform = platformService.getPlatform();
    
    if (platform === 'windows') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'VeztraPrintAgent', 'config.json');
    } else {
      return '/etc/veztra-print-agent/config.json';
    }
  }

  private loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      service: {
        port: 5050,
        host: 'localhost',
        apiVersion: 'v1'
      },
      database: {
        path: this.getDefaultDatabasePath()
      },
      logging: {
        level: process.env.LOG_LEVEL as any || 'info',
        maxSize: '10m',
        maxFiles: 10
      },
      print: {
        defaultRetries: 3,
        defaultRetryDelay: 5000,
        queueCheckInterval: 2000
      }
    };

    // Override with environment variables
    const port = process.env.PORT ? parseInt(process.env.PORT) : defaultConfig.service.port;
    const host = process.env.HOST || defaultConfig.service.host;

    try {
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return { ...defaultConfig, ...fileConfig, service: { ...defaultConfig.service, port, host } };
      }
    } catch (error) {
      console.error(`Failed to load config from ${this.configPath}, using defaults:`, error);
    }

    return { ...defaultConfig, service: { ...defaultConfig.service, port, host } };
  }

  private getDefaultDatabasePath(): string {
    const platformService = getPlatformService();
    const platform = platformService.getPlatform();

    if (platform === 'windows') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'VeztraPrintAgent', 'veztra.db');
    } else {
      return '/var/lib/veztra-print-agent/veztra.db';
    }
  }

  get(): AppConfig {
    return this.config;
  }

  getPort(): number {
    return this.config.service.port;
  }

  getHost(): string {
    return this.config.service.host;
  }

  getDatabasePath(): string {
    return this.config.database.path;
  }

  getLogLevel(): string {
    return this.config.logging.level;
  }

  getDefaultRetries(): number {
    return this.config.print.defaultRetries;
  }

  getDefaultRetryDelay(): number {
    return this.config.print.defaultRetryDelay;
  }

  getQueueCheckInterval(): number {
    return this.config.print.queueCheckInterval;
  }

  save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  ensureDirectories(): void {
    const dirs = [
      path.dirname(this.getDatabasePath()),
      getPlatformService().getLogPath()
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
}

// Singleton instance
let instance: ConfigService | null = null;

export function getConfigService(): ConfigService {
  if (!instance) {
    instance = new ConfigService();
  }
  return instance;
}
