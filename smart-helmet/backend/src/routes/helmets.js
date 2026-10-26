/**
 * Helmet management routes.
 */

const express = require('express');
const router = express.Router();
const helmetController = require('../controllers/helmetController');
const { authenticate, requireRole } = require('../middleware/auth');
const Helmet = require('../models/Helmet');

// GET /api/helmets
router.get('/', authenticate, helmetController.listHelmets);

// GET /api/helmets/:id
router.get('/:id', authenticate, helmetController.getHelmet);

// POST /api/helmets - Register/create helmet
router.post('/', authenticate, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { deviceId, displayName, assignedWorker } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const existing = await Helmet.findOne({ deviceId });
    if (existing) {
      return res.status(409).json({ error: 'Helmet with this deviceId already exists' });
    }

    const helmet = await Helmet.create({
      deviceId,
      displayName: displayName || deviceId,
      assignedWorker: assignedWorker || '',
      status: 'offline',
    });

    res.status(201).json(helmet);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/helmets/:id - Update helmet
router.patch('/:id', authenticate, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.displayName !== undefined) updates.displayName = req.body.displayName;
    if (req.body.assignedWorker !== undefined) updates.assignedWorker = req.body.assignedWorker;
    if (req.body.enabled !== undefined) updates.enabled = Boolean(req.body.enabled);

    const helmet = await Helmet.findOneAndUpdate(
      { deviceId: req.params.id },
      { $set: updates },
      { new: true }
    );

    if (!helmet) {
      return res.status(404).json({ error: 'Helmet not found' });
    }

    res.json(helmet);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/helmets/:id - Delete helmet
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const helmet = await Helmet.findOneAndDelete({ deviceId: req.params.id });
    if (!helmet) {
      return res.status(404).json({ error: 'Helmet not found' });
    }
    res.json({ message: 'Helmet deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

