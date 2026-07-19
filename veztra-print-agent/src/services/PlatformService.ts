import * as os from 'os';
import * as path from 'path';
import { IPlatformService } from '../types/index';

/**
 * Abstract platform service
 */
abstract class PlatformServiceBase implements IPlatformService {
  abstract getPlatform(): 'windows' | 'linux';
  abstract getConfigPath(): string;
  abstract getLogPath(): string;
  abstract enableAutoStart(): Promise<void>;
  abstract disableAutoStart(): Promise<void>;
  abstract isAutoStartEnabled(): Promise<boolean>;
  abstract createShortcut(name: string, target: string): Promise<void>;

  async getSystemInfo() {
    return {
      platform: this.getPlatform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      hostname: os.hostname()
    };
  }
}

/**
 * Windows Platform Service
 */
class WindowsPlatformService extends PlatformServiceBase {
  getPlatform(): 'windows' {
    return 'windows';
  }

  getConfigPath(): string {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'VeztraPrintAgent');
  }

  getLogPath(): string {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'VeztraPrintAgent', 'logs');
  }

  async enableAutoStart(): Promise<void> {
    const fs = require('fs').promises;
    const winreg = require('winreg');

    const regKey = new winreg({
      hive: winreg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    });

    const exePath = process.execPath;
    const value = `"${exePath}" --background`;

    return new Promise((resolve, reject) => {
      regKey.set('VeztraPrintAgent', winreg.REG_SZ, value, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disableAutoStart(): Promise<void> {
    const winreg = require('winreg');

    const regKey = new winreg({
      hive: winreg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    });

    return new Promise((resolve, reject) => {
      regKey.remove('VeztraPrintAgent', (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async isAutoStartEnabled(): Promise<boolean> {
    const winreg = require('winreg');

    const regKey = new winreg({
      hive: winreg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    });

    return new Promise((resolve) => {
      regKey.get('VeztraPrintAgent', (err: any, item: any) => {
        resolve(!err && !!item);
      });
    });
  }

  async createShortcut(name: string, target: string): Promise<void> {
    // Windows shortcut creation can be done via VBScript
    // This is simplified - in production you might use a package like 'windows-shortcuts'
    console.log(`Creating shortcut: ${name} -> ${target}`);
  }
}

/**
 * Linux Platform Service
 */
class LinuxPlatformService extends PlatformServiceBase {
  getPlatform(): 'linux' {
    return 'linux';
  }

  getConfigPath(): string {
    return '/etc/veztra-print-agent';
  }

  getLogPath(): string {
    return '/var/log/veztra-print-agent';
  }

  async enableAutoStart(): Promise<void> {
    // Enable systemd service
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('sudo systemctl enable veztra-print-agent.service');
      await execAsync('sudo systemctl start veztra-print-agent.service');
    } catch (error) {
      throw new Error(`Failed to enable autostart: ${error}`);
    }
  }

  async disableAutoStart(): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('sudo systemctl stop veztra-print-agent.service');
      await execAsync('sudo systemctl disable veztra-print-agent.service');
    } catch (error) {
      throw new Error(`Failed to disable autostart: ${error}`);
    }
  }

  async isAutoStartEnabled(): Promise<boolean> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('systemctl is-enabled veztra-print-agent.service');
      return stdout.trim() === 'enabled';
    } catch {
      return false;
    }
  }

  async createShortcut(name: string, target: string): Promise<void> {
    // Not applicable on Linux
    console.log(`Creating desktop shortcut: ${name}`);
  }
}

/**
 * Get platform service singleton
 */
let platformService: PlatformServiceBase | null = null;

export function getPlatformService(): PlatformServiceBase {
  if (!platformService) {
    if (process.platform === 'win32') {
      platformService = new WindowsPlatformService();
    } else {
      platformService = new LinuxPlatformService();
    }
  }
  return platformService;
}
