import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { getConfigService } from './ConfigService';
import { DbPrinter, DbPrintJob } from '../types/index';

class DatabaseService {
  private db!: any;

  initialize(): void {
    const configService = getConfigService();
    const dbPath = configService.getDatabasePath();

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Initialize tables
    this.createTables();
  }

  private createTables(): void {
    // Printers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        brand TEXT NOT NULL,
        connectionType TEXT NOT NULL,
        vendorId TEXT,
        productId TEXT,
        path TEXT,
        host TEXT,
        port INTEGER,
        timeout INTEGER,
        paperWidth INTEGER,
        maxRetries INTEGER,
        retryDelay INTEGER,
        characterEncoding TEXT,
        enabled INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    // Print jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        printerId TEXT NOT NULL,
        printerName TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        maxAttempts INTEGER DEFAULT 3,
        lastError TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        completedAt INTEGER,
        FOREIGN KEY (printerId) REFERENCES printers(id) ON DELETE CASCADE
      )
    `);

    // Create indices
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_print_jobs_printerId ON print_jobs(printerId);
      CREATE INDEX IF NOT EXISTS idx_printers_enabled ON printers(enabled);
    `);
  }

  // Printer operations
  insertPrinter(printer: DbPrinter): void {
    const stmt = this.db.prepare(`
      INSERT INTO printers (
        id, name, type, brand, connectionType, vendorId, productId, path,
        host, port, timeout, paperWidth, maxRetries, retryDelay, characterEncoding,
        enabled, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      printer.id, printer.name, printer.type, printer.brand, printer.connectionType,
      printer.vendorId, printer.productId, printer.path, printer.host, printer.port,
      printer.timeout, printer.paperWidth, printer.maxRetries, printer.retryDelay,
      printer.characterEncoding, printer.enabled, printer.createdAt, printer.updatedAt
    );
  }

  getPrinter(id: string): DbPrinter | undefined {
    const stmt = this.db.prepare('SELECT * FROM printers WHERE id = ?');
    return stmt.get(id) as DbPrinter | undefined;
  }

  getAllPrinters(): DbPrinter[] {
    const stmt = this.db.prepare('SELECT * FROM printers ORDER BY createdAt DESC');
    return stmt.all() as DbPrinter[];
  }

  updatePrinter(id: string, updates: Partial<DbPrinter>): void {
    const fields = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`)
      .join(', ');
    
    if (!fields) return;

    const values = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => (updates as any)[k]);

    const stmt = this.db.prepare(`UPDATE printers SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  deletePrinter(id: string): void {
    const stmt = this.db.prepare('DELETE FROM printers WHERE id = ?');
    stmt.run(id);
  }

  // Print job operations
  insertJob(job: DbPrintJob): void {
    const stmt = this.db.prepare(`
      INSERT INTO print_jobs (
        id, printerId, printerName, data, status, attempts, maxAttempts,
        lastError, createdAt, updatedAt, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.id, job.printerId, job.printerName, job.data, job.status,
      job.attempts, job.maxAttempts, job.lastError, job.createdAt,
      job.updatedAt, job.completedAt
    );
  }

  getJob(id: string): DbPrintJob | undefined {
    const stmt = this.db.prepare('SELECT * FROM print_jobs WHERE id = ?');
    return stmt.get(id) as DbPrintJob | undefined;
  }

  getPendingJobs(): DbPrintJob[] {
    const stmt = this.db.prepare(
      'SELECT * FROM print_jobs WHERE status = ? OR (status = ? AND attempts < maxAttempts) ORDER BY createdAt ASC'
    );
    return stmt.all('pending', 'failed') as DbPrintJob[];
  }

  getJobsByPrinter(printerId: string): DbPrintJob[] {
    const stmt = this.db.prepare(
      'SELECT * FROM print_jobs WHERE printerId = ? ORDER BY createdAt DESC LIMIT 100'
    );
    return stmt.all(printerId) as DbPrintJob[];
  }

  updateJob(id: string, updates: Partial<DbPrintJob>): void {
    const fields = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`)
      .join(', ');
    
    if (!fields) return;

    const values = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => (updates as any)[k]);

    const stmt = this.db.prepare(`UPDATE print_jobs SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  getQueueStats(): { total: number; pending: number; failed: number; completed: number } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as completed
      FROM print_jobs
    `);
    return stmt.get() as any;
  }

  cleanupOldJobs(daysOld: number = 30): number {
    const timestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare('DELETE FROM print_jobs WHERE completedAt < ? AND status = ?');
    const result = stmt.run(timestamp, 'success');
    return result.changes;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
let instance: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!instance) {
    instance = new DatabaseService();
  }
  return instance;
}
