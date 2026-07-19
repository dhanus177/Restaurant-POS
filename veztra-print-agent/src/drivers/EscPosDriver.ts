import * as escpos from 'escpos';
import * as fs from 'fs';
import * as net from 'net';
import { PrinterDriver } from './IPrinterDriver';
import { PrinterConfig, ConnectionType } from '../types/index';

/**
 * ESC/POS Driver for thermal printers (USB and Network)
 * Supports VMAX, XPrinter, Epson, Rongta, and generic ESC/POS printers
 */
export class EscPosDriver extends PrinterDriver {
  private printer?: any;
  private device?: any;
  private networkSocket?: net.Socket;

  constructor(config: PrinterConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      if (this.config.connectionType === ConnectionType.USB) {
        await this.connectUSB();
      } else if (this.config.connectionType === ConnectionType.NETWORK) {
        await this.connectNetwork();
      } else {
        throw new Error(`Unsupported connection type: ${this.config.connectionType}`);
      }

      this.connected = true;
      this.logDebug(`Connected via ${this.config.connectionType}`);
    } catch (error) {
      this.connected = false;
      this.logError(`Failed to connect`, error);
      throw error;
    }
  }

  private async connectUSB(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let vendorId: number;
        let productId: number;

        // Parse VID/PID if provided
        if (this.config.vendorId && this.config.productId) {
          vendorId = parseInt(this.config.vendorId, 16);
          productId = parseInt(this.config.productId, 16);
        } else {
          // Use defaults for common brands
          const defaults = this.getUSBDefaults();
          vendorId = defaults.vendorId;
          productId = defaults.productId;
        }

        const device = new (escpos as any).USB(vendorId, productId)
        this.printer = new (escpos as any).Printer(device)
        this.device = device;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async connectNetwork(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.host || !this.config.port) {
        reject(new Error('Network printer requires host and port'))
        return
      }

      const timeoutMs = this.config.timeout || 10000
      const socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      })

      socket.setTimeout(timeoutMs)

      const onError = (error: Error) => {
        socket.destroy()
        reject(error)
      }

      socket.once('error', onError)
      socket.once('timeout', () => onError(new Error(`Network connection timeout after ${timeoutMs}ms`)))
      socket.once('connect', () => {
        socket.removeListener('error', onError)
        this.networkSocket = socket
        this.device = socket
        resolve()
      })
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      if (this.networkSocket) {
        await new Promise<void>((resolve) => {
          this.networkSocket?.once('close', () => resolve())
          this.networkSocket?.end()
          setTimeout(() => {
            this.networkSocket?.destroy()
            resolve()
          }, 1000)
        })
        this.networkSocket = undefined
      }

      if (this.device && typeof this.device.close === 'function') {
        await new Promise<void>((resolve) => {
          try {
            this.device.close(() => resolve());
          } catch {
            resolve();
          }
        });
      }
      this.connected = false;
      this.logDebug('Disconnected');
    } catch (error) {
      this.logError('Error disconnecting', error);
    }
  }

  async print(data: string): Promise<void> {
    if (this.config.connectionType === ConnectionType.NETWORK) {
      await this.printNetwork(data)
      return
    }

    if (!this.connected) {
      await this.connect();
    }

    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        // Reset printer
        this.printer!.reset();

        // Set encoding if specified
        if (this.config.characterEncoding) {
          this.printer!.setCharacterCodeTable(this.config.characterEncoding);
        }

        // Parse ESC/POS data and send
        const commands = this.parseEscPosData(data);
        
        commands.forEach(cmd => {
          if (cmd.type === 'text') {
            this.printer!.text(cmd.value);
          } else if (cmd.type === 'line') {
            this.printer!.feed(cmd.value || 1);
          } else if (cmd.type === 'cut') {
            this.printer!.cut();
          } else if (cmd.type === 'align') {
            this.printer!.align(cmd.value);
          } else if (cmd.type === 'style') {
            if (cmd.value.bold) this.printer!.bold(true);
            if (cmd.value.underline) this.printer!.underline(true);
            if (cmd.value.width) this.printer!.setWidth(cmd.value.width);
            if (cmd.value.height) this.printer!.setHeight(cmd.value.height);
          }
        });

        this.printer!.feed(3).cut().close(() => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async printNetwork(data: string): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }

    if (!this.networkSocket) {
      throw new Error('Network socket not initialized')
    }

    const text = data
      .replace(/\[CENTER\]|\[RIGHT\]|\[LEFT\]|\[BOLD\]|\[\/BOLD\]/g, '')
      .replace(/\[CUT\]/g, '')
      .replace(/`n/g, '\n')

    const payload = Buffer.concat([
      Buffer.from(text.endsWith('\n') ? text : `${text}\n`, 'utf8'),
      Buffer.from([0x1d, 0x56, 0x00]), // Full cut
    ])

    await new Promise<void>((resolve, reject) => {
      this.networkSocket?.write(payload, (error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  private parseEscPosData(data: string): any[] {
    // Simple parser for ESC/POS commands
    const commands: any[] = [];
    const lines = data.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        commands.push({ type: 'line' });
      } else if (trimmed.startsWith('[CUT]')) {
        commands.push({ type: 'cut' });
      } else if (trimmed.startsWith('[CENTER]')) {
        commands.push({ type: 'align', value: 'center' });
      } else if (trimmed.startsWith('[RIGHT]')) {
        commands.push({ type: 'align', value: 'right' });
      } else if (trimmed.startsWith('[LEFT]')) {
        commands.push({ type: 'align', value: 'left' });
      } else if (trimmed.startsWith('[BOLD]')) {
        commands.push({ type: 'style', value: { bold: true } });
      } else if (trimmed.startsWith('[/BOLD]')) {
        commands.push({ type: 'style', value: { bold: false } });
      } else {
        commands.push({ type: 'text', value: trimmed });
      }
    });

    return commands;
  }

  private getUSBDefaults(): { vendorId: number; productId: number } {
    // Default VID/PID for common brands - user can override
    const defaults: Record<string, { vendorId: number; productId: number }> = {
      'generic': { vendorId: 0x0483, productId: 0x0001 },
      'vmax': { vendorId: 0x04b8, productId: 0x0005 },
      'xprinter': { vendorId: 0x0b3a, productId: 0x0010 },
      'epson': { vendorId: 0x04b8, productId: 0x0005 },
      'rongta': { vendorId: 0x0483, productId: 0x0001 }
    };

    return defaults[this.config.brand.toLowerCase()] || defaults['generic'];
  }
}
