import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../core/Database';
import { getLogger } from '../core/Logger';
import { getConfigService } from '../core/ConfigService';
import { PrintJob, DbPrintJob } from '../types/index';
import { PrinterManager } from './PrinterManager';

/**
 * Print Queue Service
 * Manages print job persistence, execution, and retry logic
 */
export class PrintQueueService {
  private isProcessing = false;
  private processingInterval?: NodeJS.Timer;

  constructor(private printerManager: PrinterManager) {}

  /**
   * Start queue processing
   */
  start(): void {
    const configService = getConfigService();
    const interval = configService.getQueueCheckInterval();

    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        getLogger().error('Error processing queue', error);
      });
    }, interval);

    getLogger().info('Print queue processor started');
  }

  /**
   * Stop queue processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval as NodeJS.Timeout);
      this.processingInterval = undefined;
    }
    getLogger().info('Print queue processor stopped');
  }

  /**
   * Submit a print job to the queue
   */
  submitJob(printerId: string, printerName: string, data: string): PrintJob {
    const db = getDatabase();
    const configService = getConfigService();

    const job: PrintJob = {
      id: uuidv4(),
      printerId,
      printerName,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: configService.getDefaultRetries(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const dbJob: DbPrintJob = {
      ...job,
      createdAt: job.createdAt.getTime(),
      updatedAt: job.updatedAt.getTime(),
      completedAt: undefined
    } as DbPrintJob;

    db.insertJob(dbJob);
    getLogger().info(`Job submitted to queue`, {
      jobId: job.id,
      printerId,
      printerName
    });

    return job;
  }

  /**
   * Process pending jobs from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const db = getDatabase();
      const pendingJobs = db.getPendingJobs();

      for (const dbJob of pendingJobs) {
        await this.processJob(dbJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job with retry logic
   */
  private async processJob(dbJob: DbPrintJob): Promise<void> {
    const db = getDatabase();
    const configService = getConfigService();
    const logger = getLogger();

    try {
      const printer = this.printerManager.getPrinter(dbJob.printerId);
      if (!printer) {
        logger.error(`Printer not found for job`, { jobId: dbJob.id, printerId: dbJob.printerId });
        db.updateJob(dbJob.id, {
          status: 'failed',
          lastError: 'Printer not found',
          updatedAt: Date.now()
        });
        return;
      }

      // Update job status to printing
      db.updateJob(dbJob.id, {
        status: 'printing',
        attempts: dbJob.attempts + 1,
        updatedAt: Date.now()
      });

      // Execute print
      await printer.print(dbJob.data);

      // Mark as success
      db.updateJob(dbJob.id, {
        status: 'success',
        updatedAt: Date.now(),
        completedAt: Date.now()
      });

      logger.info(`Job completed successfully`, {
        jobId: dbJob.id,
        printerName: dbJob.printerName
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const attempts = dbJob.attempts + 1;
      const maxAttempts = dbJob.maxAttempts;

      logger.warn(`Job failed (attempt ${attempts}/${maxAttempts})`, {
        jobId: dbJob.id,
        error: errorMessage
      });

      if (attempts >= maxAttempts) {
        // Max retries exceeded
        db.updateJob(dbJob.id, {
          status: 'failed',
          attempts,
          lastError: errorMessage,
          updatedAt: Date.now(),
          completedAt: Date.now()
        });

        logger.error(`Job failed after ${maxAttempts} attempts`, {
          jobId: dbJob.id,
          error: errorMessage
        });
      } else {
        // Schedule retry with exponential backoff
        db.updateJob(dbJob.id, {
          status: 'failed',
          attempts,
          lastError: errorMessage,
          updatedAt: Date.now()
        });
      }
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): PrintJob | null {
    const db = getDatabase();
    const dbJob = db.getJob(jobId);

    if (!dbJob) return null;

    return this.dbJobToPrintJob(dbJob);
  }

  /**
   * Get jobs for a specific printer
   */
  getJobsByPrinter(printerId: string): PrintJob[] {
    const db = getDatabase();
    const dbJobs = db.getJobsByPrinter(printerId);

    return dbJobs.map(job => this.dbJobToPrintJob(job));
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const db = getDatabase();
    const stats = db.getQueueStats();
    const allJobs = db.getPendingJobs();

    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      failed: stats.failed || 0,
      completed: stats.completed || 0,
      averageRetries: allJobs.length > 0
        ? allJobs.reduce((sum, j) => sum + j.attempts, 0) / allJobs.length
        : 0
    };
  }

  /**
   * Cancel a print job
   */
  cancelJob(jobId: string): boolean {
    const db = getDatabase();
    const job = db.getJob(jobId);

    if (!job) return false;

    if (job.status === 'success' || job.status === 'failed') {
      return false; // Cannot cancel completed/failed jobs
    }

    db.updateJob(jobId, {
      status: 'failed',
      lastError: 'Cancelled by user',
      updatedAt: Date.now(),
      completedAt: Date.now()
    });

    getLogger().info(`Job cancelled`, { jobId });
    return true;
  }

  /**
   * Clean up old completed jobs
   */
  cleanupOldJobs(daysOld: number = 30): number {
    const db = getDatabase();
    const deleted = db.cleanupOldJobs(daysOld);
    getLogger().info(`Cleaned up ${deleted} old print jobs`);
    return deleted;
  }

  private dbJobToPrintJob(dbJob: DbPrintJob): PrintJob {
    return {
      id: dbJob.id,
      printerId: dbJob.printerId,
      printerName: dbJob.printerName,
      data: dbJob.data,
      status: dbJob.status as any,
      attempts: dbJob.attempts,
      maxAttempts: dbJob.maxAttempts,
      lastError: dbJob.lastError,
      createdAt: new Date(dbJob.createdAt),
      updatedAt: new Date(dbJob.updatedAt),
      completedAt: dbJob.completedAt ? new Date(dbJob.completedAt) : undefined
    };
  }
}
