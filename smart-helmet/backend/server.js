/**
 * Smart Helmet for Industrial Safety - Backend Server
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { loadConfig, SAFETY_DISCLAIMER } = require('./src/config');
const { connectDB } = require('./src/config/database');
const { initSocketIO } = require('./src/socket');
const { errorHandler } = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { seedAdmin } = require('./src/utils/seedAdmin');
const deviceMonitor = require('./src/services/deviceMonitor');
const demoService = require('./src/services/demoService');
const logger = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const helmetRoutes = require('./src/routes/helmets');
const telemetryRoutes = require('./src/routes/telemetry');
const alertRoutes = require('./src/routes/alerts');
const settingsRoutes = require('./src/routes/settings');
const healthRoutes = require('./src/routes/health');

const config = loadConfig();
const app = express();
const server = http.createServer(app);

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = config.corsOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, ESP8266)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in prototype mode
    },
    credentials: true,
  })
);

// JSON body parser with bounded payload size (10kb prevents DOS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply general API rate limiter to all routes except health and telemetry
app.use('/api/', (req, res, next) => {
  if (req.path === '/health' || req.path === '/telemetry') {
    return next();
  }
  return apiLimiter()(req, res, next);
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/helmets', helmetRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/health', healthRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Helmet for Industrial Safety API',
    version: '1.0.0',
    disclaimer: SAFETY_DISCLAIMER,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      dashboard: '/api/dashboard/summary',
      helmets: '/api/helmets',
      telemetry: '/api/telemetry',
      alerts: '/api/alerts',
      settings: '/api/settings/thresholds',
    },
  });
});

// Global error handler
app.use(errorHandler);

// Initialize Socket.IO
const io = initSocketIO(server);

// Start server
async function startServer() {
  try {
    logger.info('========================================================');
    logger.info('  Smart Helmet for Industrial Safety - Backend Service  ');
    logger.info('========================================================');
    logger.info(`Notice: ${SAFETY_DISCLAIMER}`);

    // Connect to MongoDB (with automatic in-memory fallback if MongoDB is not running)
    await connectDB();

    // Seed default admin and initial threshold configuration if connected
    await seedAdmin().catch(() => {});

    // Start background device monitoring service
    deviceMonitor.start();

    // Start demo service if enabled
    if (config.demoMode) {
      demoService.start();
    }

    server.listen(config.port, config.host, () => {
      logger.info(`Backend API listening on http://${config.host}:${config.port}`);
      logger.info(`Accepting connections from ESP8266 and Web Dashboard`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, err);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  deviceMonitor.stop();
  demoService.stop();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
