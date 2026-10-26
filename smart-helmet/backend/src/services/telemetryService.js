/**
 * Telemetry processing and storage service with database and in-memory fallback.
 */

const mongoose = require('mongoose');
const Telemetry = require('../models/Telemetry');
const Helmet = require('../models/Helmet');
const alertService = require('./alertService');
const deviceMonitor = require('./deviceMonitor');
const inMemoryStore = require('../utils/inMemoryStore');
const logger = require('../utils/logger');

let io = null;

/**
 * Set the Socket.IO instance for broadcasting telemetry.
 * @param {import('socket.io').Server} socketIo
 */
function setIO(socketIo) {
  io = socketIo;
}

/**
 * Process incoming telemetry data from a device.
 * Stores the reading, updates helmet status, evaluates alerts, and broadcasts.
 *
 * @param {object} data - Raw telemetry payload (already validated)
 * @param {string} [source='hardware'] - Source identifier
 * @returns {Promise<object>} Stored telemetry document
 */
async function processTelemetry(data, source = 'hardware') {
  const receivedAt = new Date();
  const isMongoConnected = mongoose.connection.readyState === 1;

  let telemetry = null;
  let wasOffline = false;

  if (isMongoConnected) {
    try {
      telemetry = await Telemetry.create({
        deviceId: data.did,
        sequence: data.seq,
        temperatureC: data.tc,
        temperatureRaw: data.tr,
        flameDetected: data.fd,
        flameRaw: data.fr,
        deviceUptimeMs: data.up,
        firmwareVersion: data.fv,
        receivedAt,
        source,
      });

      const previousHelmet = await Helmet.findOne({ deviceId: data.did });
      wasOffline = previousHelmet && previousHelmet.status === 'offline';

      await Helmet.findOneAndUpdate(
        { deviceId: data.did },
        {
          $set: {
            lastSeenAt: receivedAt,
            status: 'online',
            firmwareVersion: data.fv,
          },
          $setOnInsert: {
            deviceId: data.did,
            displayName: data.did,
            enabled: true,
            createdAt: receivedAt,
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.warn(`Database write failed, using in-memory store: ${err.message}`);
    }
  }

  // Fallback / in-memory tracking
  if (!telemetry) {
    telemetry = {
      _id: `mem_tel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      deviceId: data.did,
      sequence: data.seq,
      temperatureC: data.tc,
      temperatureRaw: data.tr,
      flameDetected: data.fd,
      flameRaw: data.fr,
      deviceUptimeMs: data.up,
      firmwareVersion: data.fv,
      receivedAt,
      source,
      toObject() {
        return { ...this };
      },
    };

    inMemoryStore.telemetry.push(telemetry);
    if (inMemoryStore.telemetry.length > 500) {
      inMemoryStore.telemetry.shift();
    }

    let h = inMemoryStore.helmets.find((item) => item.deviceId === data.did);
    if (h) {
      wasOffline = h.status === 'offline';
      h.lastSeenAt = receivedAt;
      h.status = 'online';
      h.firmwareVersion = data.fv;
    } else {
      h = {
        _id: `mem_h_${data.did}`,
        deviceId: data.did,
        displayName: data.did,
        assignedWorker: 'Technician',
        status: 'online',
        firmwareVersion: data.fv,
        lastSeenAt: receivedAt,
        enabled: true,
        createdAt: receivedAt,
      };
      inMemoryStore.helmets.push(h);
    }
  }

  // Handle device reconnection
  if (wasOffline) {
    await deviceMonitor.handleReconnection(data.did);
  }

  // Evaluate alert rules
  await alertService.evaluateTelemetry(telemetry);

  // Broadcast via Socket.IO
  if (io) {
    const telemetryData = typeof telemetry.toObject === 'function' ? telemetry.toObject() : telemetry;
    io.emit('telemetry:new', telemetryData);
    io.to(data.did).emit('telemetry:new', telemetryData);
  }

  logger.debug(`Telemetry processed for ${data.did} (seq: ${data.seq}, source: ${source})`);
  return telemetry;
}

module.exports = { setIO, processTelemetry };
