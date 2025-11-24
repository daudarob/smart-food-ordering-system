const redis = require('redis');
const monitoringService = require('./monitoringService');

// Redis cache service with failover
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackCache = new Map(); // In-memory fallback

    this.connect();
  }

  async connect() {
    // Always attempt Redis connection in production, fallback to in-memory for development
    const shouldUseRedis = process.env.NODE_ENV === 'production' || process.env.REDIS_URL;

    if (!shouldUseRedis) {
      console.log('Development mode: using in-memory cache only');
      this.isConnected = false;
      return;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 60000,
          commandTimeout: 5000,
          lazyConnect: true,
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 20) { // Increased retry attempts
            console.error('Redis max retry attempts reached');
            return undefined;
          }
          // Exponential backoff with jitter
          const delay = Math.min(options.attempt * 200 + Math.random() * 100, 5000);
          return delay;
        }
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('Redis ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();

    } catch (error) {
      console.error('Failed to connect to Redis, using in-memory fallback:', error);
      this.isConnected = false;
    }
  }

  // Get value from cache
  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        if (value !== null) {
          monitoringService.trackCacheHit();
          return JSON.parse(value);
        } else {
          monitoringService.trackCacheMiss();
          return null;
        }
      } else {
        // Fallback to in-memory cache
        const value = this.fallbackCache.get(key);
        if (value !== undefined) {
          monitoringService.trackCacheHit();
          return value;
        } else {
          monitoringService.trackCacheMiss();
          return null;
        }
      }
    } catch (error) {
      console.error('Cache get error:', error.message || error);
      monitoringService.trackCacheMiss();
      return null;
    }
  }

  // Set value in cache
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);

      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        // Fallback to in-memory cache with TTL simulation
        this.fallbackCache.set(key, value);
        // Simulate TTL with timeout
        setTimeout(() => {
          this.fallbackCache.delete(key);
        }, ttl * 1000);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Still try fallback
      this.fallbackCache.set(key, value);
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
      // Always clear from fallback cache
      this.fallbackCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      this.fallbackCache.delete(key);
    }
  }

  // Check if cache is healthy
  async healthCheck() {
    try {
      if (this.isConnected && this.client) {
        await this.client.ping();
        return { status: 'healthy', type: 'redis' };
      } else {
        return { status: 'degraded', type: 'memory', size: this.fallbackCache.size };
      }
    } catch (error) {
      return { status: 'unhealthy', error: error.message, type: 'memory', size: this.fallbackCache.size };
    }
  }

  // Clear all cache
  async clear() {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushAll();
      }
      this.fallbackCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
      this.fallbackCache.clear();
    }
  }

  // Get cache statistics
  async stats() {
    try {
      if (this.isConnected && this.client) {
        const info = await this.client.info();
        return {
          type: 'redis',
          connected: true,
          info: info
        };
      } else {
        return {
          type: 'memory',
          connected: false,
          size: this.fallbackCache.size
        };
      }
    } catch (error) {
      return {
        type: 'error',
        connected: false,
        error: error.message,
        fallbackSize: this.fallbackCache.size
      };
    }
  }

  // Graceful shutdown
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
    }
    this.fallbackCache.clear();
    this.isConnected = false;
  }
}

module.exports = new CacheService();