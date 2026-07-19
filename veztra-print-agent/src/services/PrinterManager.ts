import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../core/Database';
import { getLogger } from '../core/Logger';
import { getConfigService } from '../core/ConfigService';
import {
  PrinterConfig,
  IPrinterDriver,
  PrinterHealthStatus,
  DbPrinter,
  ConnectionType,
  PrinterBrand,
  PrinterType
} from '../types/index';
import { EscPosDriver } from '../drivers/EscPosDriver';

/**
 * Printer Manager Service
 * Manages printer lifecycle, connections, and health monitoring
 */
export class PrinterManager {
  private drivers: Map<string, IPrinterDriver> = new Map();
  private healthChecks: Map<string, PrinterHealthStatus> = new Map();
  private healthCheckInterval?: NodeJS.Timer;

  constructor() {
    this.loadPrinters();
  }

  /**
   * Load printers from database and initialize drivers
   */
  private loadPrinters(): void {
    const db = getDatabase();
    const printers = db.getAllPrinters();

    printers.forEach(dbPrinter => {
      try {
        const config = this.dbPrinterToConfig(dbPrinter);
        if (config.enabled) {
          const driver = this.createDriver(config);
          this.drivers.set(config.id, driver);
          getLogger().info(`Printer loaded`, { name: config.name, type: config.type });
        }
      } catch (error) {
        getLogger().error(`Failed to load printer`, error);
      }
    });
  }

  /**
   * Create a new printer configuration
   */
  addPrinter(config: Omit<PrinterConfig, 'id' | 'createdAt' | 'updatedAt'>): PrinterConfig {
    const db = getDatabase();
    const configService = getConfigService();

    const newConfig: PrinterConfig = {
      ...config,
      id: uuidv4(),
      maxRetries: config.maxRetries || configService.getDefaultRetries(),
      retryDelay: config.retryDelay || configService.getDefaultRetryDelay(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const dbPrinter = this.configToDbPrinter(newConfig);
    db.insertPrinter(dbPrinter);

    const driver = this.createDriver(newConfig);
    this.drivers.set(newConfig.id, driver);

    getLogger().info(`Printer added`, { name: newConfig.name, type: newConfig.type });

    return newConfig;
  }

  /**
   * Update printer configuration
   */
  updatePrinter(id: string, updates: Partial<PrinterConfig>): PrinterConfig | null {
    const db = getDatabase();
    const existing = db.getPrinter(id);

    if (!existing) return null;

    const currentConfig = this.dbPrinterToConfig(existing);
    const updated: PrinterConfig = {
      ...currentConfig,
      ...updates,
      id, // Never change ID
      createdAt: currentConfig.createdAt, // Never change creation time
      updatedAt: new Date()
    };

    db.updatePrinter(id, this.configToDbPrinter(updated));

    // Refresh driver
    if (updated.enabled) {
      const driver = this.createDriver(updated);
      this.drivers.set(id, driver);
    } else {
      this.drivers.delete(id);
    }

    getLogger().info(`Printer updated`, { name: updated.name, id });

    return updated;
  }

  /**
   * Delete printer
   */
  deletePrinter(id: string): boolean {
    const db = getDatabase();
    const existing = db.getPrinter(id);

    if (!existing) return false;

    db.deletePrinter(id);
    this.drivers.delete(id);
    this.healthChecks.delete(id);

    getLogger().info(`Printer deleted`, { id });

    return true;
  }

  /**
   * Get printer driver by ID
   */
  getPrinter(id: string): IPrinterDriver | null {
    return this.drivers.get(id) || null;
  }

  /**
   * Get all printer configurations
   */
  getAllPrinters(): PrinterConfig[] {
    const db = getDatabase();
    return db.getAllPrinters().map(dbPrinter => this.dbPrinterToConfig(dbPrinter));
  }

  /**
   * Test printer connection
   */
  async testPrinter(id: string): Promise<boolean> {
    const driver = this.getPrinter(id);
    if (!driver) return false;

    try {
      const result = await driver.testConnection();
      getLogger().info(`Printer test completed`, { id, result });
      return result;
    } catch (error) {
      getLogger().warn(`Printer test failed`, { id, error });
      return false;
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks(intervalMs: number = 60000): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, intervalMs);

    getLogger().info('Printer health checks started');
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as NodeJS.Timeout);
      this.healthCheckInterval = undefined;
    }
    getLogger().info('Printer health checks stopped');
  }

  /**
   * Perform health checks on all printers
   */
  private async performHealthChecks(): Promise<void> {
    for (const [id, driver] of this.drivers) {
      try {
        const config = driver.getConfig();
        const isHealthy = await driver.testConnection();

        this.healthChecks.set(id, {
          printerId: id,
          printerName: config.name,
          status: isHealthy ? 'online' : 'offline',
          lastCheck: new Date()
        });
      } catch (error) {
        this.healthChecks.set(id, {
          printerId: id,
          printerName: driver.getName(),
          status: 'error',
          lastCheck: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Get printer health status
   */
  getPrinterHealth(id: string): PrinterHealthStatus | null {
    return this.healthChecks.get(id) || null;
  }

  /**
   * Get all printer health statuses
   */
  getAllPrinterHealth(): PrinterHealthStatus[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Detect USB printers
   */
  async detectUSBPrinters(): Promise<any[]> {
    try {
      const usb = require('usb');
      const devices = usb.getDeviceList();
      const printers: any[] = [];

      for (const device of devices) {
        const descriptor = device.deviceDescriptor;
        printers.push({
          vendorId: `0x${descriptor.idVendor.toString(16).padStart(4, '0')}`,
          productId: `0x${descriptor.idProduct.toString(16).padStart(4, '0')}`,
          manufacturer: device.getManufacturer ? await device.getManufacturer() : 'Unknown',
          product: device.getProduct ? await device.getProduct() : 'Unknown'
        });
      }

      return printers;
    } catch (error) {
      getLogger().error('Failed to detect USB printers', error);
      return [];
    }
  }

  /**
   * Create driver instance based on configuration
   */
  private createDriver(config: PrinterConfig): IPrinterDriver {
    // Currently only ESC/POS driver, but easily extensible
    return new EscPosDriver(config);
  }

  /**
   * Convert database printer to configuration
   */
  private dbPrinterToConfig(dbPrinter: DbPrinter): PrinterConfig {
    return {
      id: dbPrinter.id,
      name: dbPrinter.name,
      type: dbPrinter.type as PrinterType,
      brand: dbPrinter.brand as PrinterBrand,
      connectionType: dbPrinter.connectionType as ConnectionType,
      vendorId: dbPrinter.vendorId,
      productId: dbPrinter.productId,
      path: dbPrinter.path,
      host: dbPrinter.host,
      port: dbPrinter.port,
      timeout: dbPrinter.timeout,
      paperWidth: dbPrinter.paperWidth,
      maxRetries: dbPrinter.maxRetries,
      retryDelay: dbPrinter.retryDelay,
      characterEncoding: dbPrinter.characterEncoding,
      enabled: Boolean(dbPrinter.enabled),
      createdAt: new Date(dbPrinter.createdAt),
      updatedAt: new Date(dbPrinter.updatedAt)
    };
  }

  /**
   * Convert configuration to database printer
   */
  private configToDbPrinter(config: PrinterConfig): DbPrinter {
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      brand: config.brand,
      connectionType: config.connectionType,
      vendorId: config.vendorId,
      productId: config.productId,
      path: config.path,
      host: config.host,
      port: config.port,
      timeout: config.timeout,
      paperWidth: config.paperWidth,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
      characterEncoding: config.characterEncoding,
      enabled: config.enabled ? 1 : 0,
      createdAt: config.createdAt.getTime(),
      updatedAt: config.updatedAt.getTime()
    };
  }
}
