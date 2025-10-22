import app from './app';
import config from './config/config';
import sequelize, { syncDatabase } from './database/connection';
import cacheService from './services/cacheService';
import azureBlobService from './services/azureBlobService';

const startServer = async () => {
  try {
    console.log('🚀 Starting EduHub Video Service...');
    console.log(`Environment: ${config.server.env}`);

    // Connect to Redis
    console.log('Connecting to Redis...');
    await cacheService.connect();

    // Connect to Database
    console.log('Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync database (create tables if they don't exist)
    if (config.server.env === 'development') {
      await syncDatabase(false); // alter: true in development
    }

    // Verify Azure Blob Storage connection
    console.log('Verifying Azure Blob Storage connection...');
    await azureBlobService.ensureContainerExists();
    console.log('✓ Azure Blob Storage verified');

    // Start Express server
    const server = app.listen(config.server.port, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log(`✓ ${config.server.serviceName} is running`);
      console.log(`✓ Server listening on port ${config.server.port}`);
      console.log(`✓ Environment: ${config.server.env}`);
      console.log(`✓ API Base URL: http://localhost:${config.server.port}/api/v1`);
      console.log('='.repeat(60));
      console.log('');
      console.log('Available endpoints:');
      console.log(`  - Health Check: http://localhost:${config.server.port}/api/v1/health`);
      console.log(`  - Videos API: http://localhost:${config.server.port}/api/v1/videos`);
      console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('✓ HTTP server closed');

        try {
          await cacheService.disconnect();
          console.log('✓ Redis connection closed');

          await sequelize.close();
          console.log('✓ Database connection closed');

          console.log('✓ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
