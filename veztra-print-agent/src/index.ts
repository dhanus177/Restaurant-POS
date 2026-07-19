import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConfigService } from './core/ConfigService';
import { getDatabase } from './core/Database';
import { getLogger } from './core/Logger';
import { getPlatformService } from './services/PlatformService';
import { PrinterManager } from './services/PrinterManager';
import { PrintQueueService } from './services/PrintQueue';
import { createApiRoutes } from './routes/api';

// Load environment variables
dotenv.config();

async function bootstrap() {
  const logger = getLogger();
  const configService = getConfigService();
  const platformService = getPlatformService();
  const db = getDatabase();

  try {
    // Initialize core services
    logger.info('=== Veztra Print Agent Starting ===');
    logger.info(`Platform: ${platformService.getPlatform()}`);
    logger.info(`Config path: ${configService.get().database.path}`);

    // Ensure directories exist
    configService.ensureDirectories();

    // Initialize database
    db.initialize();
    logger.info('Database initialized');

    // Create service instances
    const printerManager = new PrinterManager();
    const queueService = new PrintQueueService(printerManager);

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5050'],
      credentials: true
    }));

    // Request logging middleware
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
      next();
    });

    // Error handling middleware for JSON parsing
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err instanceof SyntaxError && 'body' in err) {
        logger.error('Invalid JSON in request', { path: req.path });
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON'
        });
      }
      next();
    });

    // API routes
    const apiRoutes = createApiRoutes(printerManager, queueService);
    app.use('/api/v1', apiRoutes);

    // Root endpoint
    app.get('/', (req: express.Request, res: express.Response) => {
      res.json({
        name: 'Veztra Print Agent',
        version: '1.0.0',
        platform: platformService.getPlatform(),
        apiVersion: 'v1',
        endpoints: [
          '/api/v1/health',
          '/api/v1/printers',
          '/api/v1/print',
          '/api/v1/queue/stats',
          '/api/v1/logs'
        ]
      });
    });

    // 404 handler
    app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
      });
    });

    // Start services
    printerManager.startHealthChecks(60000); // Check every 60 seconds
    queueService.start();

    // Start server
    const port = configService.getPort();
    const host = configService.getHost();

    app.listen(port, host, () => {
      logger.info(`Server started on http://${host}:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Loaded printers: ${printerManager.getAllPrinters().length}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      printerManager.stopHealthChecks();
      queueService.stop();
      db.close();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      printerManager.stopHealthChecks();
      queueService.stop();
      db.close();
      process.exit(0);
    });

  } catch (error) {
    const logger = getLogger();
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
