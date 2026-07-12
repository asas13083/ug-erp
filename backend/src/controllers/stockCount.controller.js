const { runSerializable } = require('../utils/serializableTransaction');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { assertValidQuantities } = require('../utils/validation');

const list = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const where = { ...(warehouseId && { warehouseId }), ...buildDateRangeFilter(req) };
  const [counts, total] = await Promise.all([
    prisma.stockCount.findMany({
      where,
      include: { warehouse: true, user: { select: { fullName: true } }, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.stockCount.count({ where }),
  ]);
  res.json({ success: true, data: counts, meta: buildMeta(page, pageSize, total) });
});

/**
 * تسجيل جرد لمخزن معين. النظام بيحسب الفرق تلقائياً، وبيسوّي رصيد
 * المخزون على الكمية الفعلية المعدودة (اللي هي الأصح دايماً).
 * body: { warehouseId, notes, items: [{ itemId, actualQuantity }] }
 */
const create = asyncHandler(async (req, res) => {
  const { warehouseId, notes, items = [] } = req.body;
  if (!warehouseId || items.length === 0) {
    throw new AppError('المخزن وصنف واحد على الأقل مطلوبين', 400);
  }
  assertValidQuantities(items, 'actualQuantity', { allowZero: true });

  const count = await runSerializable(async (tx) => {
    const number = await generateCode('stockCount');

    const lines = [];
    for (const line of items) {
      const stock = await tx.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } } });
      const systemQuantity = stock?.quantity || 0;
      lines.push({
        itemId: line.itemId,
        systemQuantity,
        actualQuantity: line.actualQuantity,
        difference: line.actualQuantity - systemQuantity,
      });
    }

    const created = await tx.stockCount.create({
      data: { number, warehouseId, notes, userId: req.user.id, items: { create: lines } },
      include: { items: { include: { item: true } } },
    });

    // تسوية رصيد المخزون على الكمية الفعلية المعدودة (الأصح دايماً)
    for (const line of lines) {
      await tx.stockLevel.upsert({
        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
        update: { quantity: line.actualQuantity },
        create: { itemId: line.itemId, warehouseId, quantity: line.actualQuantity },
      });

      // لو الجرد لقى "نقص" (عدّيت فعلياً ولقيت أقل من المسجّل)، ده فاقد حقيقي
      // (سرقة أو تلف مكتشف بالجرد) — لازم يتسجّل كصف في سجل الفاقد
      if (line.difference < 0) {
        const lostQuantity = Math.abs(line.difference);
        await tx.lossRecord.create({
          data: {
            itemId: line.itemId,
            warehouseId,
            quantity: lostQuantity,
            reason: 'LOST',
            description: `فاقد تلقائي من جرد ${number}`,
            source: 'STOCK_COUNT',
            userId: req.user.id,
          },
        });
      }
    }

    const diffSummary = created.items
      .filter((i) => i.difference !== 0)
      .map((i) => `${i.item.name} (${i.difference > 0 ? '+' : ''}${i.difference})`)
      .join('، ') || 'لا يوجد فروقات';

    await logActivity({
      action: 'STOCK_COUNT',
      entityType: 'StockCount',
      entityId: created.id,
      description: `جرد ${number}: ${diffSummary}`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: count });
});

module.exports = { list, create };
