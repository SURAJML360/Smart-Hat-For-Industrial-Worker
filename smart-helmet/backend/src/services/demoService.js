/**
 * Demo service - generates simulated telemetry when DEMO_MODE is enabled.
 */

const { loadConfig } = require('../config');
const telemetryService = require('./telemetryService');
const logger = require('../utils/logger');

let demoInterval = null;
let sequence = 0;
let step = 0;
let flameCountdown = 0;
let isRunning = false;
let io = null;

/**
 * Set the Socket.IO instance for broadcasting demo status.
 * @param {import('socket.io').Server} socketIo
 */
function setIO(socketIo) {
  io = socketIo;
}

/**
 * Generate a single simulated telemetry reading.
 * Temperature: sinusoidal wave between 25-55°C with random noise.
 * Flame: randomly triggers every ~30 readings for 2-3 consecutive readings.
 */
function generateReading() {
  const config = loadConfig();
  step++;
  sequence++;

  // Sinusoidal temperature: 40 ± 15°C with noise
  const baseTemp = 40 + 15 * Math.sin(step * 0.1);
  const noise = (Math.random() - 0.5) * 4;
  const temperatureC = Math.round((baseTemp + noise) * 10) / 10;

  // Raw temperature ADC approximation (0-1023 range for 0-100°C)
  const temperatureRaw = Math.min(1023, Math.max(0, Math.round((temperatureC / 100) * 1023)));

  // Flame detection: trigger randomly every ~30 readings for 2-3 readings
  let flameDetected = false;
  if (flameCountdown > 0) {
    flameDetected = true;
    flameCountdown--;
  } else if (Math.random() < 1 / 30) {
    flameDetected = true;
    flameCountdown = 1 + Math.floor(Math.random() * 2); // 1-2 more readings
  }

  return {
    did: config.demoDeviceId,
    seq: sequence,
    tc: temperatureC,
    tr: temperatureRaw,
    fd: flameDetected,
    fr: flameDetected ? 1 : 0,
    up: step * config.demoIntervalMs,
    fv: 'DEMO-1.0.0',
  };
}

/**
 * Generate and process a single demo telemetry reading.
 */
async function tick() {
  try {
    const reading = generateReading();
    await telemetryService.processTelemetry(reading, 'demo');
  } catch (err) {
    logger.error(`Demo tick error: ${err.message}`);
  }
}

/**
 * Start the demo telemetry generator.
 */
function start() {
  if (isRunning) {
    logger.warn('Demo service is already running');
    return;
  }

  const config = loadConfig();
  sequence = 0;
  step = 0;
  flameCountdown = 0;
  isRunning = true;

  demoInterval = setInterval(tick, config.demoIntervalMs);
  logger.info(`Demo service started (device: ${config.demoDeviceId}, interval: ${config.demoIntervalMs}ms)`);

  if (io) {
    io.emit('demo:status', { enabled: true, deviceId: config.demoDeviceId });
  }
}

/**
 * Stop the demo telemetry generator.
 */
function stop() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  isRunning = false;
  logger.info('Demo service stopped');

  if (io) {
    io.emit('demo:status', { enabled: false });
  }
}

/**
 * Check if demo service is currently running.
 * @returns {boolean}
 */
function getStatus() {
  return isRunning;
}

module.exports = { setIO, start, stop, getStatus };
