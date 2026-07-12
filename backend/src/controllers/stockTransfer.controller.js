const { runSerializable } = require('../utils/serializableTransaction');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { checkAvailability } = require('../services/stockService');
const { assertValidQuantities } = require('../utils/validation');
const { deriveVehicleFields } = require('../utils/vehicles');

const list = asyncHandler(async (req, res) => {
  const transfers = await prisma.stockTransfer.findMany({
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      user: { select: { fullName: true } },
      items: { include: { item: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: transfers });
});

/** body: { fromWarehouseId, toWarehouseId, notes, items: [{ itemId, quantity }] } */
const create = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, notes, vehicles, items = [] } = req.body;

  if (!fromWarehouseId || !toWarehouseId || items.length === 0) {
    throw new AppError('المخزن المصدر والمخزن الهدف وصنف واحد على الأقل مطلوبين', 400);
  }
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError('لا يمكن نقل أصناف لنفس المخزن', 400);
  }
  assertValidQuantities(items);

  const transfer = await runSerializable(async (tx) => {
    for (const line of items) {
      await checkAvailability({ itemId: line.itemId, warehouseId: fromWarehouseId, quantity: line.quantity, tx });
    }

    const number = await generateCode('stockTransfer');
    const created = await tx.stockTransfer.create({
      data: {
        number,
        fromWarehouseId,
        toWarehouseId,
        notes,
        ...deriveVehicleFields(vehicles),
        userId: req.user.id,
        items: { create: items.map((l) => ({ itemId: l.itemId, quantity: l.quantity })) },
      },
      include: { items: { include: { item: true } } },
    });

    for (const line of items) {
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: fromWarehouseId } },
        data: { quantity: { decrement: line.quantity } },
      });
      await tx.stockLevel.upsert({
        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: toWarehouseId } },
        update: { quantity: { increment: line.quantity } },
        create: { itemId: line.itemId, warehouseId: toWarehouseId, quantity: line.quantity },
      });
    }

    const summary = created.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، ');
    await logActivity({
      action: 'TRANSFER',
      entityType: 'StockTransfer',
      entityId: created.id,
      description: `نقل ${number}: ${summary}`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: transfer });
});

module.exports = { list, create };
