const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { assertValidQuantities } = require('../utils/validation');
const { runSerializable } = require('../utils/serializableTransaction');
const { buildEventItemSummary } = require('../services/eventSettlement');
const { getEventScope } = require('../utils/eventScope');
const { deriveVehicleFields } = require('../utils/vehicles');

const list = asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const scope = await getEventScope(req.user.id);
  const where = {
    AND: [
      ...(eventId ? [{ OR: [{ fromEventId: eventId }, { toEventId: eventId }] }] : []),
      ...(scope ? [{ OR: [{ fromEventId: { in: scope } }, { toEventId: { in: scope } }] }] : []),
      buildDateRangeFilter(req),
    ],
  };
  const [transfers, total] = await Promise.all([
    prisma.custodyTransfer.findMany({
      where,
      include: { fromEvent: true, toEvent: true, user: { select: { fullName: true } }, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } }, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.custodyTransfer.count({ where }),
  ]);
  res.json({ success: true, data: transfers, meta: buildMeta(page, pageSize, total) });
});

const getOne = asyncHandler(async (req, res) => {
  const transfer = await prisma.custodyTransfer.findUnique({
    where: { id: req.params.id },
    include: { fromEvent: true, toEvent: true, user: { select: { fullName: true } }, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } }, items: { include: { item: true } } },
  });
  if (!transfer) throw new AppError('عملية نقل العهدة غير موجودة', 404);
  res.json({ success: true, data: transfer });
});

// بيحسب "لسه برا" الفعلي لكل صنف في حفلة معينة، مع إمكانية استثناء نقل عهدة
// معينة من الحساب (مفيد وقت التعديل: بنحسب المتاح وكأن النقل الحالي مبقاش موجود)
async function getPendingMap(tx, eventId, excludeTransferId) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    include: {
      issueVouchers: { include: { items: { include: { item: true } } } },
      returnVouchers: { include: { items: { include: { item: true } } } },
      lossRecords: { include: { item: true } },
      custodyTransfersOut: { include: { items: { include: { item: true } } } },
      custodyTransfersIn: { include: { items: { include: { item: true } } } },
    },
  });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);
  if (excludeTransferId) {
    event.custodyTransfersOut = event.custodyTransfersOut.filter((t) => t.id !== excludeTransferId);
    event.custodyTransfersIn = event.custodyTransfersIn.filter((t) => t.id !== excludeTransferId);
  }
  const summary = buildEventItemSummary(event);
  return new Map(summary.map((s) => [s.itemId, s.pending]));
}

/**
 * إنشاء نقل عهدة من حفلة لحفلة تانية مباشرة — من غير ما ترجع للمخزن.
 * الكمية المسموح نقلها محدودة بـ"لسه برا" الفعلي للحفلة المصدر.
 * body: { fromEventId, toEventId, receiverName, vehicles, notes, items: [{itemId, quantity}] }
 */
const create = asyncHandler(async (req, res) => {
  const { fromEventId, toEventId, receiverName, vehicles, notes, handedByUserId, receivedByUserId, items = [] } = req.body;
  if (!fromEventId || !toEventId || !receiverName || items.length === 0) {
    throw new AppError('الحفلة المصدر والحفلة الهدف واسم المستلم وصنف واحد على الأقل مطلوبين', 400);
  }
  if (fromEventId === toEventId) {
    throw new AppError('لازم تكون الحفلة المصدر مختلفة عن الحفلة الهدف', 400);
  }
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(fromEventId)) {
    throw new AppError('غير مسموح لك بنقل عهدة من هذه الحفلة — مش من ضمن الحفلات المعيّن عليها', 403);
  }
  assertValidQuantities(items);

  const transfer = await runSerializable(async (tx) => {
    const pendingMap = await getPendingMap(tx, fromEventId);

    for (const line of items) {
      const available = pendingMap.get(line.itemId) || 0;
      if (Number(line.quantity) > available) {
        throw new AppError(`الكمية المطلوب نقلها أكبر من "لسه برا" فعلياً في الحفلة المصدر (المتاح: ${available})`, 400);
      }
    }

    const number = await generateCode('custodyTransfer');
    const created = await tx.custodyTransfer.create({
      data: {
        number,
        fromEventId,
        toEventId,
        receiverName,
        handedByUserId: handedByUserId || null,
        receivedByUserId: receivedByUserId || null,
        ...deriveVehicleFields(vehicles),
        notes,
        userId: req.user.id,
        items: { create: items.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })) },
      },
      include: { items: { include: { item: true } }, fromEvent: true, toEvent: true, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } } },
    });

    const itemsSummaryText = created.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، ');
    await logActivity({
      action: 'TRANSFER',
      entityType: 'CustodyTransfer',
      entityId: created.id,
      description: `نقل عهدة ${created.number}: ${itemsSummaryText} — من "${created.fromEvent.name}" إلى "${created.toEvent.name}"`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: transfer });
});

/**
 * تعديل نقل عهدة موجود — تقدر تغيّر الأصناف/الكميات، اسم المستلم، بيانات
 * النقل، والملاحظات. مينفعش تغيّر الحفلة المصدر أو الهدف بعد الإنشاء
 * (لو غلط في الحفلة، الأصح تلغي وتعمل واحدة جديدة).
 */
const update = asyncHandler(async (req, res) => {
  const { receiverName, vehicles, notes, handedByUserId, receivedByUserId, items = [] } = req.body;
  assertValidQuantities(items);

  const transfer = await runSerializable(async (tx) => {
    const existing = await tx.custodyTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!existing) throw new AppError('عملية نقل العهدة غير موجودة', 404);
    if (existing.status === 'CANCELLED') throw new AppError('العملية دي ملغاة بالفعل، مينفعش تتعدّل', 400);

    // نحسب "لسه برا" وكأن النقل الحالي مبقاش موجود، عشان نسمح بتعديل نفس
    // الكمية اللي كانت متسجلة أصلاً من غير ما نرفضها غلط
    const pendingMap = await getPendingMap(tx, existing.fromEventId, existing.id);
    for (const line of items) {
      const available = pendingMap.get(line.itemId) || 0;
      if (Number(line.quantity) > available) {
        throw new AppError(`الكمية أكبر من "لسه برا" فعلياً في الحفلة المصدر (المتاح: ${available})`, 400);
      }
    }

    // فحص أمان: لو بنقلل كمية صنف كان منقول للحفلة الهدف، لازم نتأكد إن
    // الحفلة الهدف لسه محتفظة بالفرق ده ومنقلتوش أو رجّعتوش هي كمان
    const oldQtyMap = new Map(existing.items.map((i) => [i.itemId, i.quantity]));
    const newQtyMap = new Map(items.map((i) => [i.itemId, Number(i.quantity)]));
    const decreasingItemIds = Array.from(new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])).filter(
      (itemId) => (newQtyMap.get(itemId) || 0) < (oldQtyMap.get(itemId) || 0)
    );
    if (decreasingItemIds.length > 0) {
      const toPendingMap = await getPendingMap(tx, existing.toEventId);
      for (const itemId of decreasingItemIds) {
        const reduceBy = (oldQtyMap.get(itemId) || 0) - (newQtyMap.get(itemId) || 0);
        const toPending = toPendingMap.get(itemId) || 0;
        if (toPending < reduceBy) {
          throw new AppError('مينفعش تقلّل الكمية دي — الحفلة الهدف نقلت أو رجّعت جزء من الصنف ده بالفعل.', 409);
        }
      }
    }

    await tx.custodyTransferItem.deleteMany({ where: { transferId: existing.id } });
    const updated = await tx.custodyTransfer.update({
      where: { id: existing.id },
      data: {
        ...(receiverName && { receiverName }),
        ...(handedByUserId !== undefined && { handedByUserId: handedByUserId || null }),
        ...(receivedByUserId !== undefined && { receivedByUserId: receivedByUserId || null }),
        ...(vehicles !== undefined && deriveVehicleFields(vehicles)),
        ...(notes !== undefined && { notes }),
        items: { create: items.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })) },
      },
      include: { items: { include: { item: true } }, fromEvent: true, toEvent: true, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } } },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'CustodyTransfer',
      entityId: updated.id,
      description: `تعديل نقل عهدة ${updated.number}`,
      userId: req.user.id,
      tx,
    });

    return updated;
  });

  res.json({ success: true, data: transfer });
});

// DELETE /api/custody-transfers/:id — إلغاء نقل العهدة (بيفضل في السجل كأرشيف، بس مبيتحسبش في التسوية بعد كده)
const cancel = asyncHandler(async (req, res) => {
  const transfer = await runSerializable(async (tx) => {
    const existing = await tx.custodyTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!existing) throw new AppError('عملية نقل العهدة غير موجودة', 404);
    if (existing.status === 'CANCELLED') throw new AppError('العملية دي ملغاة بالفعل', 400);

    // فحص أمان: لو الحفلة الهدف نقلت الصنف ده بعد كده لحفلة تالتة (أو رجّعته
    // أو سجّلته فاقد)، مينفعش نلغي النقل الأصلي — هيسيب الحفلة الهدف بكمية
    // "سالبة منطقياً" (بتاعت حاجة مبقاش عندها مصدر واضح ليها أصلاً)
    const pendingMap = await getPendingMap(tx, existing.toEventId);
    for (const line of existing.items) {
      const pending = pendingMap.get(line.itemId) || 0;
      if (pending < line.quantity) {
        throw new AppError(
          'مينفعش تلغي نقل العهدة ده — الحفلة الهدف نقلت أو رجّعت الصنف بعد كده. لازم تلغي أو تعدّل العمليات اللي بعده الأول.',
          409
        );
      }
    }

    const updated = await tx.custodyTransfer.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
    await logActivity({
      action: 'DELETE',
      entityType: 'CustodyTransfer',
      entityId: updated.id,
      description: `إلغاء نقل عهدة ${updated.number}`,
      userId: req.user.id,
      tx,
    });
    return updated;
  });
  res.json({ success: true, data: transfer });
});

module.exports = { list, getOne, create, update, cancel };
