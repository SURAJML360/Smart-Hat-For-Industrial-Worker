/**
 * Admin account and initial seed utility.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Helmet = require('../models/Helmet');
const ThresholdConfig = require('../models/ThresholdConfig');
const { loadConfig } = require('../config');
const logger = require('./logger');

async function seedAdmin() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      logger.debug('Skipping MongoDB collections seeding: MongoDB is in-memory/disconnected');
      return;
    }

    const config = loadConfig();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@smarthelmet.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        email: adminEmail,
        passwordHash,
        role: 'admin',
        displayName: 'System Administrator',
      });
      logger.info(`Default admin user created: ${adminEmail}`);
    } else {
      logger.debug(`Admin user already exists: ${adminEmail}`);
    }

    // Seed default global threshold if none exists
    const globalThreshold = await ThresholdConfig.findOne({ scope: 'global' });
    if (!globalThreshold) {
      await ThresholdConfig.create({
        scope: 'global',
        deviceId: null,
        temperatureWarningC: config.temperatureWarningC,
        temperatureCriticalC: config.temperatureCriticalC,
        flameActiveHigh: config.flameActiveHigh,
        deviceOfflineTimeoutS: config.deviceOfflineTimeoutS,
      });
      logger.info('Default global threshold configuration created');
    }

    // Seed default prototype helmet (HELMET-001) if no helmets exist
    const helmetCount = await Helmet.countDocuments();
    if (helmetCount === 0) {
      await Helmet.create({
        deviceId: 'HELMET-001',
        displayName: 'Worker Helmet Alpha',
        assignedWorker: 'John Doe (Technician)',
        status: 'offline',
        firmwareVersion: '1.0.0',
      });
      logger.info('Default helmet HELMET-001 registered');
    }
  } catch (err) {
    logger.error(`Seed error: ${err.message}`, err);
  }
}

module.exports = { seedAdmin };

