import { createClient, RedisClientType } from 'redis';
import config from '../config/config';

class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✓ Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('✓ Redis client ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('Redis client connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        console.warn('Redis not connected, skipping cache get');
        return null;
      }

      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.warn('Redis not connected, skipping cache set');
        return false;
      }

      const serialized = JSON.stringify(value);
      const expiry = ttl || config.redis.ttl;

      await this.client.setEx(key, expiry, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.warn('Redis not connected, skipping cache delete');
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        console.warn('Redis not connected, skipping cache pattern delete');
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      return await this.client.incr(key);
    } catch (error) {
      console.error('Cache increment error:', error);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${config.server.serviceName}:${prefix}:${parts.join(':')}`;
  }

  async flushAll(): Promise<void> {
    if (config.server.env === 'development' || config.server.env === 'test') {
      await this.client.flushDb();
    } else {
      throw new Error('flushAll is only allowed in development or test environments');
    }
  }

  getStatus(): boolean {
    return this.isConnected;
  }
}

export default new CacheService();
