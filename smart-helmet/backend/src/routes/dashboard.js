/**
 * Dashboard routes.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', authenticate, dashboardController.getSummary);

module.exports = router;

