/**
 * Settings and configuration routes.
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { thresholdSchema } = require('../validators/threshold');
const demoService = require('../services/demoService');

// GET /api/settings/thresholds
router.get('/thresholds', authenticate, settingsController.getThresholds);

// PATCH /api/settings/thresholds - Admin only
router.patch(
  '/thresholds',
  authenticate,
  requireRole('admin'),
  validate(thresholdSchema),
  settingsController.updateThresholds
);

// POST /api/settings/demo/toggle
router.post('/demo/toggle', authenticate, (req, res) => {
  const current = demoService.getStatus();
  if (current) {
    demoService.stop();
  } else {
    demoService.start();
  }
  res.json({ enabled: demoService.getStatus() });
});

// GET /api/settings/demo/status
router.get('/demo/status', authenticate, (req, res) => {
  res.json({ enabled: demoService.getStatus() });
});

module.exports = router;

