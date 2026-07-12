const express = require('express');
const router = express.Router();
const { getStats, getMonthlyStats } = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/stats', requireAuth, getStats);
router.get('/monthly-stats', requireAuth, getMonthlyStats);

module.exports = router;
