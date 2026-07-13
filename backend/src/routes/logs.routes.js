const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getRecentErrors } = require('../controllers/logs.controller');

router.get('/errors', requireAuth, requirePermission('settings', 'view'), getRecentErrors);

module.exports = router;
