import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/config';
import videoRoutes from './routes/videoRoutes';
import healthRoutes from './routes/healthRoutes';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  })
);

// Logging middleware
if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes
app.use('/api/v1', healthRoutes);

// API routes
app.use('/api/v1/videos', videoRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: config.server.serviceName,
    version: '1.0.0',
    status: 'running',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);

  res.status(500).json({
    success: false,
    message: config.server.env === 'development' ? err.message : 'Internal server error',
    ...(config.server.env === 'development' && { stack: err.stack }),
  });
});

export default app;
