const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/maintenance.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requirePermission('items', 'view'), ctrl.list);
router.post('/', requirePermission('items', 'edit'), ctrl.create);
router.put('/:id/status', requirePermission('items', 'edit'), ctrl.updateStatus);

module.exports = router;
