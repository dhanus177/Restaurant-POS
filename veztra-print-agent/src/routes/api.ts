import { Router, Request, Response } from 'express';
import { getLogger } from '../core/Logger';
import { getConfigService } from '../core/ConfigService';
import { getPlatformService } from '../services/PlatformService';
import { PrinterManager } from '../services/PrinterManager';
import { PrintQueueService } from '../services/PrintQueue';
import { ApiResponse, ServiceStatus } from '../types/index';

/**
 * API Routes Factory
 */
export function createApiRoutes(
  printerManager: PrinterManager,
  queueService: PrintQueueService
): Router {
  const router = Router();
  const logger = getLogger();
  const configService = getConfigService();
  const platformService = getPlatformService();

  const startTime = Date.now();

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const status: ServiceStatus = {
      uptime,
      version: '1.0.0',
      platform: platformService.getPlatform(),
      port: configService.getPort(),
      printers: printerManager.getAllPrinterHealth(),
      queueLength: queueService.getQueueStats().total,
      totalJobsProcessed: queueService.getQueueStats().completed
    };

    res.json({ success: true, data: status });
  });

  // Get all printers
  router.get('/printers', (req: Request, res: Response) => {
    try {
      const printers = printerManager.getAllPrinters();
      const response: ApiResponse = {
        success: true,
        data: printers
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting printers', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get single printer
  router.get('/printers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const printers = printerManager.getAllPrinters();
      const printer = printers.find(p => p.id === id);

      if (!printer) {
        return res.status(404).json({
          success: false,
          error: 'Printer not found'
        });
      }

      res.json({ success: true, data: printer });
    } catch (error) {
      logger.error('Error getting printer', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add printer
  router.post('/printers', (req: Request, res: Response) => {
    try {
      const printer = printerManager.addPrinter(req.body);
      res.status(201).json({ success: true, data: printer });
      logger.info('Printer added via API', { printer: printer.name });
    } catch (error) {
      logger.error('Error adding printer', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update printer
  router.put('/printers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const printer = printerManager.updatePrinter(id, req.body);

      if (!printer) {
        return res.status(404).json({
          success: false,
          error: 'Printer not found'
        });
      }

      res.json({ success: true, data: printer });
      logger.info('Printer updated via API', { id });
    } catch (error) {
      logger.error('Error updating printer', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete printer
  router.delete('/printers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const deleted = printerManager.deletePrinter(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Printer not found'
        });
      }

      res.json({ success: true, message: 'Printer deleted' });
      logger.info('Printer deleted via API', { id });
    } catch (error) {
      logger.error('Error deleting printer', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test printer
  router.post('/printers/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await printerManager.testPrinter(id);

      res.json({
        success: true,
        data: {
          printerId: id,
          status: result ? 'online' : 'offline'
        }
      });
    } catch (error) {
      logger.error('Error testing printer', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Detect USB printers
  router.get('/printers/detect/usb', async (req: Request, res: Response) => {
    try {
      const devices = await printerManager.detectUSBPrinters();
      res.json({ success: true, data: devices });
    } catch (error) {
      logger.error('Error detecting USB printers', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Submit print job
  router.post('/print', (req: Request, res: Response) => {
    try {
      const { printerId, printerName, data } = req.body;

      if (!printerId || !data) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: printerId, data'
        });
      }

      const job = queueService.submitJob(printerId, printerName || printerId, data);
      res.status(202).json({ success: true, data: job });
      logger.info('Print job submitted', { jobId: job.id, printerId });
    } catch (error) {
      logger.error('Error submitting print job', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get print job
  router.get('/print/:jobId', (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const job = queueService.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({ success: true, data: job });
    } catch (error) {
      logger.error('Error getting print job', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get queue status
  router.get('/queue/stats', (req: Request, res: Response) => {
    try {
      const stats = queueService.getQueueStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error getting queue stats', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get queue logs
  router.get('/logs', (req: Request, res: Response) => {
    try {
      const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
      const logs = getLogger().getRecentLogs(lines);
      res.json({ success: true, data: logs });
    } catch (error) {
      logger.error('Error getting logs', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System info
  router.get('/system/info', async (req: Request, res: Response) => {
    try {
      const info = await platformService.getSystemInfo();
      res.json({ success: true, data: info });
    } catch (error) {
      logger.error('Error getting system info', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
