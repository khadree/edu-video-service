import { Router, Request, Response } from 'express';
import cacheService from '../services/cacheService';
import { testConnection } from '../database/connection';
import azureBlobService from '../services/azureBlobService';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'video-service',
      uptime: process.uptime(),
      checks: {
        database: 'DOWN',
        redis: 'DOWN',
        azureBlob: 'DOWN',
      },
    };

    // Check database connection
    try {
      const dbConnected = await testConnection();
      health.checks.database = dbConnected ? 'UP' : 'DOWN';
    } catch (error) {
      health.checks.database = 'DOWN';
    }

    // Check Redis connection
    health.checks.redis = cacheService.getStatus() ? 'UP' : 'DOWN';

    // Check Azure Blob Storage
    try {
      await azureBlobService.ensureContainerExists();
      health.checks.azureBlob = 'UP';
    } catch (error) {
      health.checks.azureBlob = 'DOWN';
    }

    // Determine overall status
    const allHealthy = Object.values(health.checks).every((status) => status === 'UP');
    health.status = allHealthy ? 'UP' : 'DEGRADED';

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      service: 'video-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Readiness probe (Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbConnected = await testConnection();
    const redisConnected = cacheService.getStatus();

    if (dbConnected && redisConnected) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbConnected,
          redis: redisConnected,
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Liveness probe (Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
