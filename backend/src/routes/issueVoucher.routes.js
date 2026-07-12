const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/issueVoucher.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requirePermission('issueVouchers', 'view'), ctrl.list);
router.get('/:id', requirePermission('issueVouchers', 'view'), ctrl.getOne);
router.post('/', requirePermission('issueVouchers', 'create'), ctrl.create);
router.put('/:id', requirePermission('issueVouchers', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('issueVouchers', 'delete'), ctrl.cancel);

module.exports = router;
