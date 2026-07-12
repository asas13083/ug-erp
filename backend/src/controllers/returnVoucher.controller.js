const { runSerializable } = require('../utils/serializableTransaction');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { assertValidReturnLines } = require('../utils/validation');
const { getEventScope } = require('../utils/eventScope');
const { checkAvailability } = require('../services/stockService');
const { deriveVehicleFields } = require('../utils/vehicles');

const list = asyncHandler(async (req, res) => {
  const { eventId, warehouseId } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const scope = await getEventScope(req.user.id);

  let eventFilter;
  if (eventId) {
    if (scope && !scope.includes(eventId)) throw new AppError('غير مسموح لك بالوصول لأذون هذه الحفلة', 403);
    eventFilter = eventId;
  } else if (scope) {
    eventFilter = { in: scope };
  }

  const where = { ...(eventFilter && { eventId: eventFilter }), ...(warehouseId && { warehouseId }), ...buildDateRangeFilter(req) };
  const [vouchers, total] = await Promise.all([
    prisma.returnVoucher.findMany({
      where,
      include: { event: { include: { client: true } }, warehouse: true, user: { select: { fullName: true } }, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } }, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.returnVoucher.count({ where }),
  ]);
  res.json({ success: true, data: vouchers, meta: buildMeta(page, pageSize, total) });
});

/**
 * إنشاء إذن مرتجع.
 * body: { eventId, warehouseId, notes,
 *         items: [{ itemId, issuedQuantity, returnedQuantity, damagedQuantity }] }
 *
 * المنطق:
 * - returnedQuantity (سليم) + damagedQuantity (تالف لكن عاد) بيرجعوا فعلياً للمخزون
 * - أي فرق = issuedQuantity - returnedQuantity - damagedQuantity يُعتبر "مفقود"
 *   وبيتسجل تلقائياً كسجل فاقد (LossRecord) بدون تدخل يدوي
 */
const create = asyncHandler(async (req, res) => {
  const { eventId, warehouseId, notes, vehicles, handedByUserId, receivedByUserId, items = [] } = req.body;

  if (!eventId || !warehouseId || items.length === 0) {
    throw new AppError('الحفلة والمخزن وصنف واحد على الأقل مطلوبين', 400);
  }
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(eventId)) {
    throw new AppError('غير مسموح لك بتسجيل مرتجع لهذه الحفلة — مش من ضمن الحفلات المعيّن عليها', 403);
  }
  assertValidReturnLines(items);

  const voucher = await runSerializable(async (tx) => {
    const number = await generateCode('returnVoucher');

    const created = await tx.returnVoucher.create({
      data: {
        number,
        eventId,
        warehouseId,
        notes,
        handedByUserId: handedByUserId || null,
        receivedByUserId: receivedByUserId || null,
        ...deriveVehicleFields(vehicles),
        userId: req.user.id,
        items: {
          create: items.map((l) => ({
            itemId: l.itemId,
            issuedQuantity: l.issuedQuantity,
            returnedQuantity: l.returnedQuantity,
            damagedQuantity: l.damagedQuantity || 0,
            lostQuantity: Math.max(l.issuedQuantity - l.returnedQuantity - (l.damagedQuantity || 0), 0),
          })),
        },
      },
      include: { items: { include: { item: true } } },
    });

    for (const line of created.items) {
      const backToStock = line.returnedQuantity + line.damagedQuantity;
      if (backToStock > 0) {
        await tx.stockLevel.upsert({
          where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
          update: { quantity: { increment: backToStock } },
          create: { itemId: line.itemId, warehouseId, quantity: backToStock },
        });
        // الصنف ممكن يكون رجع لمخزن مختلف عن اللي خرج منه أصلاً (بعد ما اتنقل
        // عهدة مثلاً) — بنتأكد إن الكمية الأساسية للمخزن ده على الأقل بقد
        // كميته الفعلية الجديدة، عشان المخزن الجديد ميفضلش شايف رقم أقل من
        // المفروض رغم إنه فعلياً مستلم الصنف ده دلوقتي
      }

      if (line.lostQuantity > 0) {
        await tx.lossRecord.create({
          data: {
            itemId: line.itemId,
            eventId,
            warehouseId,
            quantity: line.lostQuantity,
            reason: 'LOST',
            description: `فاقد تلقائي من إذن المرتجع ${created.number} (${line.item.name})`,
            source: 'RETURN_VOUCHER',
            userId: req.user.id,
          },
        });
        // فاقد حقيقي (حتى لو تلقائي من المرتجع) = نقص دائم فعلي، فبننقص
        // الكمية الأساسية بيه كمان مش الفعلية بس
      }
    }

    const summary = created.items
      .map((i) => `${i.item.name}: سليم ${i.returnedQuantity}${i.damagedQuantity ? `، تالف ${i.damagedQuantity}` : ''}${i.lostQuantity ? `، فاقد ${i.lostQuantity}` : ''}`)
      .join(' | ');

    await logActivity({
      action: 'RETURN',
      entityType: 'ReturnVoucher',
      entityId: created.id,
      description: `إذن مرتجع ${created.number}: ${summary}`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: voucher });
});

module.exports = { list, create };

/**
 * إلغاء إذن مرتجع: يعكس أثره بالكامل —
 * يخصم من المخزون اللي كان اتزود (سليم + تالف)، ويحذف أي سجل فاقد تلقائي
 * كان اتعمل بسبب الإذن ده، ويحول حالة الإذن لـ CANCELLED (بدون حذفه نهائياً).
 */
const cancel = asyncHandler(async (req, res) => {
  const voucher = await prisma.returnVoucher.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { item: true } } },
  });
  if (!voucher) throw new AppError('إذن المرتجع غير موجود', 404);
  if (voucher.status === 'CANCELLED') throw new AppError('الإذن ده ملغي بالفعل', 400);

  await runSerializable(async (tx) => {
    // فحص أمان: لو الكمية اللي رجعت للمخزن اتصرفت تاني بعد كده لحفلة تانية،
    // مينفعش نلغي المرتجع ده — لأن ده هيخصم كمية مش موجودة أصلاً ويودّي لرصيد سالب
    for (const line of voucher.items) {
      const backToStock = line.returnedQuantity + line.damagedQuantity;
      if (backToStock > 0) {
        await checkAvailability({ itemId: line.itemId, warehouseId: voucher.warehouseId, quantity: backToStock, tx });
      }
    }

    for (const line of voucher.items) {
      const backToStock = line.returnedQuantity + line.damagedQuantity;
      if (backToStock > 0) {
        await tx.stockLevel.update({
          where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: voucher.warehouseId } },
          data: { quantity: { decrement: backToStock } },
        });
        // ملحوظة: مش بنلمس الكمية الأساسية هنا عمداً — لو اتصحّحت لما الصنف
        // وصل المخزن ده، التصحيح ده بيفضل قائم (زي أي تصحيح جرد بالظبط)،
        // مش بنرجعه لأننا مش متأكدين المخزن ده هيرجع "يستاهل" التصحيح ولا لأ
      }
      if (line.lostQuantity > 0) {
      }
    }
    // حذف أي سجل فاقد تلقائي كان اتعمل بسبب الإذن ده تحديداً
    await tx.lossRecord.deleteMany({
      where: { description: { contains: voucher.number } },
    });
    await tx.returnVoucher.update({ where: { id: voucher.id }, data: { status: 'CANCELLED' } });
    await logActivity({
      action: 'DELETE',
      entityType: 'ReturnVoucher',
      entityId: voucher.id,
      description: `إلغاء إذن مرتجع ${voucher.number} — تم عكس أثره على المخزون`,
      userId: req.user.id,
      tx,
    });
  });

  res.json({ success: true, message: 'تم إلغاء الإذن وعكس أثره على المخزون' });
});

module.exports.cancel = cancel;

/**
 * تعديل إذن مرتجع كامل — بتعكس أثر النسخة القديمة تماماً وتطبّق الجديدة بدلها.
 * يشمل: إضافة/حذف أصناف، تغيير الكميات السليمة/التالفة، وإعادة حساب الفاقد تلقائياً.
 * body: { items: [{ itemId, issuedQuantity, returnedQuantity, damagedQuantity }] }
 */
const update = asyncHandler(async (req, res) => {
  const { notes, vehicles, handedByUserId, receivedByUserId, items = [] } = req.body;
  assertValidReturnLines(items);

  const voucher = await runSerializable(async (tx) => {
    const existing = await tx.returnVoucher.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) throw new AppError('إذن المرتجع غير موجود', 404);
    if (existing.status === 'CANCELLED') throw new AppError('لا يمكن تعديل إذن ملغي', 400);

    // فحص أمان: لو الكمية اللي رجعت للمخزن من الإذن القديم اتصرفت تاني بعد
    // كده، مينفعش نعكس أثرها هنا — هيودّي لرصيد سالب وهمي
    for (const line of existing.items) {
      const oldBackToStock = line.returnedQuantity + line.damagedQuantity;
      if (oldBackToStock > 0) {
        await checkAvailability({ itemId: line.itemId, warehouseId: existing.warehouseId, quantity: oldBackToStock, tx });
      }
    }

    // عكس أثر الأصناف القديمة بالكامل على المخزون
    for (const line of existing.items) {
      const oldBackToStock = line.returnedQuantity + line.damagedQuantity;
      if (oldBackToStock > 0) {
        await tx.stockLevel.update({
          where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: existing.warehouseId } },
          data: { quantity: { decrement: oldBackToStock } },
        });
        // (نفس الملحوظة: مش بنلمس الكمية الأساسية هنا، بتفضل زي ما اتصحّحت)
      }
      if (line.lostQuantity > 0) {
      }
    }
    // حذف أي سجل فاقد تلقائي قديم مرتبط بالإذن ده
    await tx.lossRecord.deleteMany({ where: { description: { contains: existing.number } } });
    await tx.returnVoucherItem.deleteMany({ where: { voucherId: existing.id } });

    // تطبيق الأصناف الجديدة
    const newItems = items.map((l) => ({
      itemId: l.itemId,
      issuedQuantity: l.issuedQuantity,
      returnedQuantity: l.returnedQuantity,
      damagedQuantity: l.damagedQuantity || 0,
      lostQuantity: Math.max(l.issuedQuantity - l.returnedQuantity - (l.damagedQuantity || 0), 0),
    }));

    const updated = await tx.returnVoucher.update({
      where: { id: existing.id },
      data: { ...(notes !== undefined && { notes }), ...(vehicles !== undefined && deriveVehicleFields(vehicles)), items: { create: newItems } },
      include: { items: { include: { item: true } } },
    });

    for (const line of updated.items) {
      const backToStock = line.returnedQuantity + line.damagedQuantity;
      if (backToStock > 0) {
        await tx.stockLevel.upsert({
          where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: existing.warehouseId } },
          update: { quantity: { increment: backToStock } },
          create: { itemId: line.itemId, warehouseId: existing.warehouseId, quantity: backToStock },
        });
      }
      if (line.lostQuantity > 0) {
        await tx.lossRecord.create({
          data: {
            itemId: line.itemId,
            eventId: existing.eventId,
            warehouseId: existing.warehouseId,
            quantity: line.lostQuantity,
            reason: 'LOST',
            description: `فاقد تلقائي من إذن المرتجع ${updated.number} (${line.item.name})`,
            source: 'RETURN_VOUCHER',
            userId: req.user.id,
          },
        });
      }
    }

    await logActivity({
      action: 'UPDATE',
      entityType: 'ReturnVoucher',
      entityId: updated.id,
      description: `تعديل إذن مرتجع ${updated.number}`,
      userId: req.user.id,
      tx,
    });

    return updated;
  });

  res.json({ success: true, data: voucher });
});

module.exports.update = update;

// GET /api/return-vouchers/damaged/list — كل سطور "التالف" من كل أذون المرتجع (قسم مستقل)
const listDamaged = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const scope = await getEventScope(req.user.id);
  const where = {
    damagedQuantity: { gt: 0 },
    voucher: {
      ...(warehouseId && { warehouseId }),
      ...(scope && { eventId: { in: scope } }),
      ...buildDateRangeFilter(req),
    },
  };
  const [items, total] = await Promise.all([
    prisma.returnVoucherItem.findMany({
      where,
      include: { item: true, voucher: { include: { event: true, warehouse: true, user: { select: { fullName: true } } } } },
      orderBy: { voucher: { createdAt: 'desc' } },
      skip,
      take,
    }),
    prisma.returnVoucherItem.count({ where }),
  ]);
  res.json({ success: true, data: items, meta: buildMeta(page, pageSize, total) });
});

module.exports.listDamaged = listDamaged;
