const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/returnVoucher.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { validateBody } = require('../utils/validateBody');
const { returnVoucherSchema } = require('../validation/voucher.schema');

router.use(requireAuth);
router.get('/', requirePermission('returnVouchers', 'view'), ctrl.list);
router.get('/damaged/list', requirePermission('damagedItems', 'view'), ctrl.listDamaged);
router.post('/', requirePermission('returnVouchers', 'create'), validateBody(returnVoucherSchema), ctrl.create);
router.put('/:id', requirePermission('returnVouchers', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('returnVouchers', 'delete'), ctrl.cancel);

module.exports = router;
