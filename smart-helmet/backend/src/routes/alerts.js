/**
 * Alert management routes.
 */

const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { acknowledgeAlertSchema, resolveAlertSchema } = require('../validators/alert');

// GET /api/alerts
router.get('/', authenticate, alertController.listAlerts);

// PATCH /api/alerts/:id/acknowledge
router.patch(
  '/:id/acknowledge',
  authenticate,
  requireRole('admin', 'operator'),
  validate(acknowledgeAlertSchema),
  alertController.acknowledgeAlert
);

// PATCH /api/alerts/:id/resolve
router.patch(
  '/:id/resolve',
  authenticate,
  requireRole('admin', 'operator'),
  validate(resolveAlertSchema),
  alertController.resolveAlert
);

module.exports = router;

