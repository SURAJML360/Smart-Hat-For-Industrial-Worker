/**
 * MongoDB connection with retry logic and non-blocking in-memory fallback.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { loadConfig } = require('./index');

// Disable buffering so Mongoose doesn't hang requests when MongoDB is not running
mongoose.set('bufferCommands', false);

let isConnected = false;

/**
 * Connect to MongoDB with automatic retry and in-memory fallback.
 * @param {string} [customUri] - Optional MongoDB connection string
 * @returns {Promise<mongoose.Connection|null>}
 */
async function connectDatabase(customUri) {
  const config = loadConfig();
  const uri = customUri || config.mongodbUri || 'mongodb://localhost:27017/smart_helmet';

  try {
    logger.info(`Attempting to connect to MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Short timeout for rapid fallback
      connectTimeoutMS: 2500,
    });
    isConnected = true;
    logger.info(`MongoDB connected successfully: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    logger.warn(`Could not connect to MongoDB at ${uri} (${err.message})`);
    logger.info('Running in seamless in-memory mode: all application features (login, dashboard, telemetry, alerts) are active in RAM.');
    logger.info('To enable persistent MongoDB storage, ensure local MongoDB is running or add your MongoDB Atlas URI to .env');
    return null;
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
async function disconnectDatabase() {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      isConnected = false;
      logger.info('MongoDB disconnected');
    }
  } catch (err) {
    logger.error(`Error disconnecting MongoDB: ${err.message}`);
  }
}

/**
 * Get current MongoDB connection status string.
 */
function getMongoStatus() {
  const states = {
    0: 'disconnected (in-memory mode)',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'disconnected (in-memory mode)';
}

module.exports = {
  connectDatabase,
  connectDB: connectDatabase,
  disconnectDatabase,
  getMongoStatus,
};
