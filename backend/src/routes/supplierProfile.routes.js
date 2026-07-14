const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/supplier.controller');

router.use(requireAuth);

// قايمة الموردين مع المستحق لكل واحد + ملف المورد
router.get('/with-balances', requirePermission('suppliers', 'view'), ctrl.listWithBalances);
router.get('/:id/profile', requirePermission('suppliers', 'view'), ctrl.getSupplierProfile);
router.get('/:id/export-excel', requirePermission('suppliers', 'view'), ctrl.exportSupplierExcel);

// الدفعات
router.post('/:id/payments', requirePermission('suppliers', 'edit'), ctrl.createPayment);
router.delete('/payments/:id', requirePermission('suppliers', 'delete'), ctrl.deletePayment);

module.exports = router;
