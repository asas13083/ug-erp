const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/custodyTransfer.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { validateBody } = require('../utils/validateBody');
const { custodyTransferSchema } = require('../validation/voucher.schema');

router.use(requireAuth);
router.get('/', requirePermission('custodyTransfers', 'view'), ctrl.list);
router.get('/:id', requirePermission('custodyTransfers', 'view'), ctrl.getOne);
router.post('/', requirePermission('custodyTransfers', 'create'), validateBody(custodyTransferSchema), ctrl.create);
router.put('/:id', requirePermission('custodyTransfers', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('custodyTransfers', 'delete'), ctrl.cancel);

module.exports = router;
