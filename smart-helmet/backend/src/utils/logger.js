/**
 * Simple logger utility with level-based filtering.
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

let currentLevel = LOG_LEVELS.info;

function setLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
  }
}

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

const logger = {
  setLevel,

  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message), ...args);
    }
  },

  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message), ...args);
    }
  },

  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message), ...args);
    }
  },
};

module.exports = logger;
