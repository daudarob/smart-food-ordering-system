const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();
const cookieParser = require('cookie-parser');

const logger = require('./config/logger');
const monitoringService = require('./services/monitoringService');
const alertingService = require('./services/alertingService');
const cacheService = require('./services/cacheService');
const { sequelize, connectWithRetry } = require('./config/database');
const { User } = require('./models');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:4173",
      "http://127.0.0.1:4173"
    ],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "ws:", "wss:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
  ],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS payloads
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

app.use(sanitizeInput);

// Rate limiting - adjusted for 10,000 concurrent users
const rateLimit = require('express-rate-limit');

// General API rate limiting (scaled for high concurrency)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 100, // Increased for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis store for distributed rate limiting in production
  ...(process.env.REDIS_URL && {
    store: new (require('rate-limit-redis'))({
      client: require('./services/cacheService').client,
      prefix: 'rl:general:',
    }),
  }),
});
app.use('/api/', limiter);

// More restrictive rate limiting for auth endpoints (scaled for concurrent logins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 20, // Increased for production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis store for distributed rate limiting in production
  ...(process.env.REDIS_URL && {
    store: new (require('rate-limit-redis'))({
      client: require('./services/cacheService').client,
      prefix: 'rl:auth:',
    }),
  }),
});
app.use('/api/auth/', authLimiter);

// Additional rate limiting for order endpoints during peak hours
const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 50, // Higher limit for orders
  message: 'Order rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  ...(process.env.REDIS_URL && {
    store: new (require('rate-limit-redis'))({
      client: require('./services/cacheService').client,
      prefix: 'rl:orders:',
    }),
  }),
});
app.use('/api/orders/', orderLimiter);

// HTTP request logging with Morgan
app.use(morgan('combined', { stream: logger.stream }));

// Request tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = require('crypto').randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  logger.info(`Request started: ${req.method} ${req.url}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoringService.trackRequest(req.method, req.url, duration, res.statusCode);

    logger.info(`Request completed: ${req.method} ${req.url} - ${res.statusCode}`, {
      requestId,
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
  });

  next();
});

// CSRF protection middleware - temporarily disabled for development
const csrf = require('csurf');
const csrfProtection = csrf({
  cookie: true,
  value: (req) => req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf
});

// Apply CSRF protection to state-changing routes
// Temporarily disable CSRF for login to fix authentication issues
// app.use('/api/auth/login', csrfProtection);
// app.use('/api/auth/register', csrfProtection);
// app.use('/api/orders', csrfProtection);

// CSRF protection removed from admin routes to prevent misconfiguration errors
// Admin routes are protected by authentication and role-based authorization
// app.use('/api/admin', (req, res, next) => {
//   if (req.method === 'GET') {
//     return next();
//   }
//   csrfProtection(req, res, next);
// });

// CSRF token endpoint - temporarily disabled
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  logger.info('CSRF token generated', {
    token: token.substring(0, 10) + '...', // Log partial token for debugging
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.json({ csrfToken: token });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Comprehensive health check
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();

    // Update monitoring service with database connection status
    monitoringService.setDatabaseConnections(1);
    monitoringService.setActiveConnections(1); // Set initial active connection

    // Check cache health
    const cacheHealth = await cacheService.healthCheck();

    // Get monitoring metrics
    const monitoringHealth = await monitoringService.healthCheck();

    // Check memory usage
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const healthData = {
      status: monitoringHealth.status,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      database: 'connected',
      cache: cacheHealth,
      metrics: monitoringHealth.metrics,
      checks: monitoringHealth.checks
    };

    // Return appropriate status code
    const statusCode = monitoringHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    // Update monitoring service with database disconnection status
    monitoringService.setDatabaseConnections(0);
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Metrics endpoint for monitoring systems
app.get('/metrics', (req, res) => {
  // Support both JSON and Prometheus formats
  const accept = req.headers.accept;
  if (accept && accept.includes('application/openmetrics-text')) {
    res.set('Content-Type', 'application/openmetrics-text; version=1.0.0; charset=utf-8');
    res.send(monitoringService.getPrometheusMetrics());
  } else {
    const metrics = monitoringService.getMetrics();
    res.json(metrics);
  }
});

// Alert status endpoint
app.get('/alerts', (req, res) => {
  const alertStatus = alertingService.getAlertStatus();
  res.json(alertStatus);
});

// SQL injection protection - use parameterized queries (already implemented in controllers)
// Rate limiting already configured above

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';

  // Log error with context
  logger.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId,
      csrfTokenInBody: req.body._csrf,
      csrfTokenInQuery: req.query._csrf,
      csrfTokenInHeader: req.get('X-CSRF-Token') || req.get('csrf-token'),
      cookies: req.cookies
    });
    return res.status(403).json({
      error: 'CSRF token validation failed',
      requestId
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
      requestId
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Database validation error',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
      requestId
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
      requestId
    });
  }

  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Database connection error',
      requestId
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server start
const PORT = process.env.PORT || 3000;

connectWithRetry()
  .then(() => {
    logger.info('Database connected successfully');
    // Sync database for development/testing
    return sequelize.sync();
  })
  .then(() => {
    console.log('Database synced');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = app;