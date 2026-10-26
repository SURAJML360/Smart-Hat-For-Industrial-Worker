/**
 * Socket.IO setup and event handlers.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');
const telemetryService = require('../services/telemetryService');
const alertService = require('../services/alertService');
const deviceMonitor = require('../services/deviceMonitor');
const demoService = require('../services/demoService');

/**
 * Initialize Socket.IO with HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
function initSocketIO(httpServer) {
  const config = loadConfig();

  // Parse CORS origins
  const allowedOrigins = config.corsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Inject IO into services
  telemetryService.setIO(io);
  alertService.setIO(io);
  deviceMonitor.setIO(io);
  demoService.setIO(io);

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    try {
      // Support token in handshake auth or query
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        // In development or demo, allow connection or enforce
        logger.warn(`Socket.IO connection rejected: missing token from ${socket.id}`);
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.warn(`Socket.IO auth error for ${socket.id}: ${err.message}`);
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.email || 'authenticated'})`);

    // Allow client to subscribe to specific device updates
    socket.on('subscribe:device', (deviceId) => {
      if (deviceId) {
        socket.join(deviceId);
        logger.debug(`Socket ${socket.id} joined room for ${deviceId}`);
      }
    });

    socket.on('unsubscribe:device', (deviceId) => {
      if (deviceId) {
        socket.leave(deviceId);
        logger.debug(`Socket ${socket.id} left room for ${deviceId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

module.exports = { initSocketIO };

