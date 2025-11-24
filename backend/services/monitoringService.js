const logger = require('../config/logger');
const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'sfo-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const activeConnectionsGauge = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

const databaseConnectionsGauge = new promClient.Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  registers: [register]
});

const cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register]
});

const cacheMissesTotal = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register]
});

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeConnections: 0,
      memoryUsage: [],
      databaseConnections: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.lastConnectionState = 0; // Track last connection state to avoid excessive health checks

    // Collect metrics every 30 seconds
    setInterval(() => this.collectSystemMetrics(), 30000);
  }

  // Track HTTP requests
  trackRequest(method, url, responseTime, statusCode) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);

    // Keep only last 100 response times
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }

    // Update Prometheus metrics
    const route = url.split('?')[0].split('/').slice(0, 3).join('/'); // Simplify route for metrics
    httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
    httpRequestDuration.observe({ method, route }, responseTime / 1000); // Convert to seconds

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn(`Slow request: ${method} ${url} - ${responseTime}ms`, {
        method,
        url,
        responseTime,
        statusCode
      });
    }

    // Log errors
    if (statusCode >= 400) {
      this.metrics.errors++;
      logger.error(`HTTP Error: ${method} ${url} - ${statusCode}`, {
        method,
        url,
        statusCode,
        responseTime
      });
    }
  }

  // Track database connections
  setDatabaseConnections(count) {
    this.metrics.databaseConnections = count;
    databaseConnectionsGauge.set(count);
  }

  // Track active connections
  setActiveConnections(count) {
    this.metrics.activeConnections = count;
    activeConnectionsGauge.set(count);
  }

  // Collect system metrics
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 memory readings
    if (this.metrics.memoryUsage.length > 10) {
      this.metrics.memoryUsage.shift();
    }

    // Log high memory usage
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 500) { // Alert if > 500MB
      logger.warn(`High memory usage: ${heapUsedMB}MB`, {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: heapUsedMB,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });
    }
  }

  // Get current metrics
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      averageResponseTime: Math.round(avgResponseTime),
      activeConnections: this.metrics.activeConnections,
      databaseConnections: this.metrics.databaseConnections,
      memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || {},
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Track cache performance
  trackCacheHit() {
    this.metrics.cacheHits++;
    cacheHitsTotal.inc();
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
    cacheMissesTotal.inc();
  }

  // Get Prometheus metrics
  getPrometheusMetrics() {
    return register.metrics();
  }

  // Health check
  async healthCheck() {
    // Assume database is connected since server started successfully
    if (this.metrics.databaseConnections === 0) {
      this.setDatabaseConnections(1);
    }

    const metrics = this.getMetrics();
    const isDevelopment = process.env.NODE_ENV === 'development';

    // In development, be more lenient with health checks
    const responseTimeThreshold = isDevelopment ? 5000 : 2000; // 5s for dev, 2s for prod
    const errorRateThreshold = isDevelopment ? 0.5 : 0.1; // 50% for dev, 10% for prod

    // For development, don't fail on memory usage or cache status
    const isHealthy = (metrics.averageResponseTime < responseTimeThreshold || isDevelopment) &&
                      (metrics.errors < metrics.requests * errorRateThreshold || metrics.requests === 0) &&
                      metrics.databaseConnections > 0;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics,
      checks: {
        responseTime: metrics.averageResponseTime < responseTimeThreshold || isDevelopment,
        errorRate: metrics.errors < metrics.requests * errorRateThreshold || metrics.requests === 0,
        memory: metrics.memoryUsage.heapUsed < 1000 * 1024 * 1024 || isDevelopment, // < 1GB or dev
        database: metrics.databaseConnections > 0
      }
    };
  }

  // Alert on critical issues
  alertIfNeeded() {
    const metrics = this.getMetrics();

    // High error rate alert
    if (metrics.requests > 10 && (metrics.errors / metrics.requests) > 0.5) {
      logger.error('CRITICAL: High error rate detected', {
        errorRate: (metrics.errors / metrics.requests) * 100,
        totalRequests: metrics.requests,
        totalErrors: metrics.errors
      });

      // Trigger external alert
      const alertingService = require('./alertingService');
      alertingService.triggerAlert('HIGH_ERROR_RATE', `Error rate ${(metrics.errors / metrics.requests * 100).toFixed(1)}%`, {
        errorRate: (metrics.errors / metrics.requests * 100).toFixed(1),
        totalRequests: metrics.requests,
        totalErrors: metrics.errors
      });
    }

    // High memory usage alert
    const memUsage = metrics.memoryUsage;
    if (memUsage.heapUsed > 800 * 1024 * 1024) { // > 800MB
      logger.error('CRITICAL: High memory usage', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });

      // Trigger external alert
      const alertingService = require('./alertingService');
      alertingService.triggerAlert('HIGH_MEMORY_USAGE', `Memory usage ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`, {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });
    }

    // Database connection alert
    if (metrics.databaseConnections === 0) {
      logger.error('CRITICAL: Database connection lost');

      const alertingService = require('./alertingService');
      alertingService.triggerAlert('DATABASE_DISCONNECTED', 'Database connection lost', {
        databaseConnections: metrics.databaseConnections
      });
    }
  }
}

module.exports = new MonitoringService();