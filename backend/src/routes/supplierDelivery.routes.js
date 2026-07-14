const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/supplier.controller');

router.use(requireAuth);

// أمين المخزن بيشوف الواردات ويضيفها للمخزن — بصلاحية المخزون، مش الحسابات
// (عشان يشوف الأصناف من غير ما يشوف أي بيانات مالية خالص)
router.get('/', requirePermission('items', 'view'), ctrl.listDeliveries);
router.post('/:lineId/add-to-warehouse', requirePermission('items', 'create'), ctrl.addDeliveryToWarehouse);

module.exports = router;
