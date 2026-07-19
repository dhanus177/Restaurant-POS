/**
 * Veztra Print Agent - Core Type Definitions
 */

// Printer Configuration Types
export enum PrinterType {
  RECEIPT = 'receipt',
  KITCHEN = 'kitchen',
  BAR = 'bar',
  CUSTOM = 'custom'
}

export enum ConnectionType {
  USB = 'usb',
  NETWORK = 'network'
}

export enum PrinterBrand {
  GENERIC = 'generic',
  VMAX = 'vmax',
  XPRINTER = 'xprinter',
  EPSON = 'epson',
  RONGTA = 'rongta'
}

export interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  brand: PrinterBrand;
  connectionType: ConnectionType;
  
  // USB Configuration
  vendorId?: string;
  productId?: string;
  path?: string;
  
  // Network Configuration
  host?: string;
  port?: number;
  timeout?: number;
  
  // Print Settings
  paperWidth?: number;
  maxRetries?: number;
  retryDelay?: number;
  characterEncoding?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintJob {
  id: string;
  printerId: string;
  printerName: string;
  data: string;
  status: 'pending' | 'printing' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PrinterHealthStatus {
  printerId: string;
  printerName: string;
  status: 'online' | 'offline' | 'error';
  lastCheck: Date;
  errorMessage?: string;
}

export interface ServiceStatus {
  uptime: number;
  version: string;
  platform: 'windows' | 'linux';
  port: number;
  printers: PrinterHealthStatus[];
  queueLength: number;
  totalJobsProcessed: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  completed: number;
  averageRetries: number;
}

// Printer Driver Interface
export interface IPrinterDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
  print(data: string): Promise<void>;
  getName(): string;
  getConfig(): PrinterConfig;
}

// Platform Service Interface
export interface IPlatformService {
  getPlatform(): 'windows' | 'linux';
  getConfigPath(): string;
  getLogPath(): string;
  enableAutoStart(): Promise<void>;
  disableAutoStart(): Promise<void>;
  isAutoStartEnabled(): Promise<boolean>;
  createShortcut(name: string, target: string): Promise<void>;
  getSystemInfo(): Promise<any>;
}

// Database Types
export interface DbPrinter {
  id: string;
  name: string;
  type: string;
  brand: string;
  connectionType: string;
  vendorId?: string;
  productId?: string;
  path?: string;
  host?: string;
  port?: number;
  timeout?: number;
  paperWidth?: number;
  maxRetries?: number;
  retryDelay?: number;
  characterEncoding?: string;
  enabled: number;
  createdAt: number;
  updatedAt: number;
}

export interface DbPrintJob {
  id: string;
  printerId: string;
  printerName: string;
  data: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
