import { IPrinterDriver, PrinterConfig } from '../types/index';

/**
 * Abstract base class for printer drivers
 * Concrete implementations provide platform and printer-specific logic
 */
export abstract class PrinterDriver implements IPrinterDriver {
  protected config: PrinterConfig;
  protected connected: boolean = false;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract print(data: string): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  getName(): string {
    return this.config.name;
  }

  getConfig(): PrinterConfig {
    return this.config;
  }

  protected logDebug(message: string): void {
    console.debug(`[${this.getName()}] ${message}`);
  }

  protected logError(message: string, error?: any): void {
    console.error(`[${this.getName()}] ${message}`, error);
  }
}
