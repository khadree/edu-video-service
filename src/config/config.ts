import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  server: {
    port: number;
    env: string;
    serviceName: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    ttl: number;
  };
  azure: {
    storage: {
      accountName: string;
      accountKey: string;
      containerName: string;
      connectionString: string;
    };
    cdn: {
      endpoint: string;
      profile: string;
    };
  };
  upload: {
    maxFileSize: number;
    allowedFormats: string[];
    tempDir: string;
  };
  sas: {
    expiryHours: number;
    permissions: string;
  };
  logging: {
    level: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  jwt: {
    secret: string;
    issuer: string;
  };
  services: {
    authService: string;
    catalogService: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3003', 10),
    env: process.env.NODE_ENV || 'development',
    serviceName: process.env.SERVICE_NAME || 'video-service',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'eduhub_videos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  azure: {
    storage: {
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'videos',
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    },
    cdn: {
      endpoint: process.env.AZURE_CDN_ENDPOINT || '',
      profile: process.env.AZURE_CDN_PROFILE || '',
    },
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000', 10), // 500MB default
    allowedFormats: (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,wmv,flv,mkv,webm').split(','),
    tempDir: process.env.UPLOAD_TEMP_DIR || path.join(process.cwd(), 'uploads', 'temp'),
  },
  sas: {
    expiryHours: parseInt(process.env.SAS_TOKEN_EXPIRY_HOURS || '24', 10),
    permissions: process.env.SAS_TOKEN_PERMISSIONS || 'r',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    issuer: process.env.JWT_ISSUER || 'eduhub-auth-service',
  },
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    catalogService: process.env.CATALOG_SERVICE_URL || 'http://localhost:3002',
  },
};

export default config;
