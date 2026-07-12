const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lossRecord.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requirePermission('lossRecords', 'view'), ctrl.list);
router.post('/', requirePermission('lossRecords', 'create'), ctrl.create);
router.put('/:id', requirePermission('lossRecords', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('lossRecords', 'delete'), ctrl.cancel);

module.exports = router;
