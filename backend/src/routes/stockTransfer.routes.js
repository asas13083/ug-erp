const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockTransfer.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requirePermission('warehouses', 'view'), ctrl.list);
router.post('/', requirePermission('warehouses', 'edit'), ctrl.create);

module.exports = router;
