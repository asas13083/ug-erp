const express = require('express');
const buildCrudRouter = require('../utils/buildCrudRouter');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { computeWarehouseStillOut } = require('../services/eventSettlement');

const router = buildCrudRouter('warehouse', 'مخزن', { searchFields: ['name', 'location'], module: 'warehouses', entityType: 'Warehouse', openListToAnyUser: true });

// GET /api/warehouses/:id/stock — كل الأصناف وأرصدتها داخل مخزن معين
// متاح لأي مستخدم مسجّل دخول من غير فحص صلاحية "warehouses" تحديداً — لازم
// كقائمة مرجعية وقت اختيار الأصناف جوه أي إذن (صرف/مرتجع/نقل مخزن/جرد)
router.get(
  '/:id/stock',
  requireAuth,
  asyncHandler(async (req, res) => {
    const warehouseId = req.params.id;
    const stock = await prisma.stockLevel.findMany({
      where: { warehouseId, item: { isActive: true } },
      include: { item: { include: { category: true } } },
      orderBy: { item: { name: 'asc' } },
    });

    // "لسه برا" الحقيقي (بيتتبّع الحفلة، مش بس هل رجع لنفس المخزن ده) + الفاقد
    const itemIds = stock.map((s) => s.itemId);
    const [stillOutMap, lossLines] = await Promise.all([
      computeWarehouseStillOut(warehouseId, itemIds),
      prisma.lossRecord.findMany({
        where: { itemId: { in: itemIds }, warehouseId, status: 'CONFIRMED' },
        select: { itemId: true, quantity: true },
      }),
    ]);
    const lostMap = new Map();
    lossLines.forEach((l) => lostMap.set(l.itemId, (lostMap.get(l.itemId) || 0) + l.quantity));

    const stockWithOut = stock.map((s) => ({ ...s, stillOut: Math.max(stillOutMap.get(s.itemId) || 0, 0), lost: lostMap.get(s.itemId) || 0 }));
    res.json({ success: true, data: stockWithOut });
  })
);

// PUT /api/warehouses/:id/stock/:itemId/min-quantity — تعديل الحد الأدنى لصنف في المخزن ده تحديداً
router.put(
  '/:id/stock/:itemId/min-quantity',
  requireAuth,
  requirePermission('warehouses', 'edit'),
  asyncHandler(async (req, res) => {
    const { id: warehouseId, itemId } = req.params;
    const { minQuantity } = req.body;
    const value = Number(minQuantity);
    if (!Number.isFinite(value) || value < 0) {
      const { AppError } = require('../utils/errors');
      throw new AppError('الحد الأدنى لازم يكون رقم صحيح غير سالب', 400);
    }
    const updated = await prisma.stockLevel.upsert({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      update: { minQuantity: value },
      create: { itemId, warehouseId, quantity: 0, minQuantity: value },
    });
    res.json({ success: true, data: updated });
  })
);

// GET /api/warehouses/:id/movements — كل عمليات الصرف/المرتجع/الفاقد الخاصة بمخزن معين
router.get(
  '/:id/movements',
  requireAuth,
  requirePermission('warehouses', 'view'),
  asyncHandler(async (req, res) => {
    const warehouseId = req.params.id;
    const [issued, returned, lost] = await Promise.all([
      prisma.issueVoucher.findMany({
        where: { warehouseId },
        include: { event: true, items: { include: { item: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.returnVoucher.findMany({
        where: { warehouseId },
        include: { event: true, items: { include: { item: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lossRecord.findMany({
        where: { warehouseId },
        include: { item: true, event: true, user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json({ success: true, data: { issued, returned, lost } });
  })
);

module.exports = router;
