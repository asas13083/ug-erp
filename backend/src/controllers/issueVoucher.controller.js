const { runSerializable } = require('../utils/serializableTransaction');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { checkAvailability } = require('../services/stockService');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { assertValidQuantities } = require('../utils/validation');
const { getEventScope } = require('../utils/eventScope');
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
    prisma.issueVoucher.findMany({
      where,
      include: { event: { include: { client: true } }, warehouse: true, user: { select: { fullName: true } }, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } }, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.issueVoucher.count({ where }),
  ]);
  res.json({ success: true, data: vouchers, meta: buildMeta(page, pageSize, total) });
});

const getOne = asyncHandler(async (req, res) => {
  const voucher = await prisma.issueVoucher.findUnique({
    where: { id: req.params.id },
    include: { event: { include: { client: true } }, warehouse: true, user: { select: { fullName: true } }, handedBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } }, items: { include: { item: true } } },
  });
  if (!voucher) throw new AppError('إذن الصرف غير موجود', 404);
  res.json({ success: true, data: voucher });
});

/**
 * إنشاء إذن صرف جديد.
 * body: { warehouseId, eventId, recipientName, notes, items: [{ itemId, quantity }] }
 *
 * المنطق:
 * 1. فحص توفر كل صنف في المخزن (مع مراعاة المحجوز لحفلات أخرى)
 * 2. خصم الكمية فعلياً من المخزن
 * 3. لو الصنف كان محجوز لنفس الحفلة، بيتحرر الحجز بمقدار المصروف
 * 4. تسجيل العملية في سجل الحركة (وبالتالي إشعار الإيميل تلقائياً)
 */
const create = asyncHandler(async (req, res) => {
  const { warehouseId, eventId, recipientName, notes, vehicles, handedByUserId, receivedByUserId, items = [] } = req.body;

  if (!warehouseId || !eventId || !recipientName || items.length === 0) {
    throw new AppError('المخزن والحفلة واسم المستلم وصنف واحد على الأقل مطلوبين', 400);
  }
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(eventId)) {
    throw new AppError('غير مسموح لك بالصرف لهذه الحفلة — مش من ضمن الحفلات المعيّن عليها', 403);
  }
  assertValidQuantities(items);

  const voucher = await runSerializable(async (tx) => {
    // فحص توفر كل الأصناف الأول قبل أي خصم (عشان منخصمش جزء ونفشل في الباقي)
    for (const line of items) {
      await checkAvailability({ itemId: line.itemId, warehouseId, quantity: line.quantity, tx });
    }

    const number = await generateCode('issueVoucher');
    const created = await tx.issueVoucher.create({
      data: {
        number,
        warehouseId,
        eventId,
        recipientName,
        handedByUserId: handedByUserId || null,
        receivedByUserId: receivedByUserId || null,
        notes,
        ...deriveVehicleFields(vehicles),
        userId: req.user.id,
        items: { create: items.map((l) => ({ itemId: l.itemId, quantity: l.quantity })) },
      },
      include: { items: { include: { item: true } } },
    });

    for (const line of items) {
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
        data: { quantity: { decrement: line.quantity } },
      });

      // تحرير أي حجز لنفس الصنف بنفس الحفلة بمقدار المصروف فعلياً
      const reservation = await tx.reservation.findFirst({ where: { eventId, itemId: line.itemId } });
      if (reservation) {
        const releaseAmount = Math.min(reservation.quantity, line.quantity);
        await tx.stockLevel.update({
          where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
          data: { reservedQty: { decrement: releaseAmount } },
        });
      }
    }

    const itemsSummary = created.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، ');
    await logActivity({
      action: 'ISSUE',
      entityType: 'IssueVoucher',
      entityId: created.id,
      description: `إذن صرف ${created.number}: ${itemsSummary} — المستلم: ${recipientName}`,
      userId: req.user.id,
      tx,
    });

    // أول ما يتصرف حاجة من الحفلة، حالتها تتحول تلقائياً لـ"جارية" عشان تظهر في قائمة "إذن مرتجع"
    // (المسؤول يقدر بعد كده يقفلها يدوياً لما تخلص كل عمليات الحفلة)
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (event && event.status === 'PLANNED') {
      await tx.event.update({ where: { id: eventId }, data: { status: 'ONGOING' } });
    }

    return created;
  });

  res.status(201).json({ success: true, data: voucher });
});

/**
 * إلغاء إذن صرف: يرجّع الكميات المخصومة للمخزون تلقائياً، ويحرر أي حجز
 * كان اتحرر بسببه، ويسجل الإلغاء في سجل الحركة. الإذن نفسه بيفضل موجود
 * (بحالة CANCELLED) للحفاظ على الأرشيف، مش بيتمسح نهائي من قاعدة البيانات.
 */
const { buildEventItemSummary } = require('../services/eventSettlement');

const cancel = asyncHandler(async (req, res) => {
  const voucher = await prisma.issueVoucher.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { item: true } } },
  });
  if (!voucher) throw new AppError('إذن الصرف غير موجود', 404);
  if (voucher.status === 'CANCELLED') throw new AppError('الإذن ده ملغي بالفعل', 400);

  await runSerializable(async (tx) => {
    // فحص أمان مهم: لو أي صنف في الإذن ده اتنقل بعد كده لحفلة تانية عن طريق
    // نقل عهدة، مينفعش نلغي الإذن ونرجّع الكمية للمخزن — لأن ده هيخلق كمية
    // "وهمية" (نفس القطعة تبقى موجودة في المخزن وفي الحفلة التانية في نفس الوقت)
    const event = await tx.event.findUnique({
      where: { id: voucher.eventId },
      include: {
        issueVouchers: { include: { items: { include: { item: true } } } },
        returnVouchers: { include: { items: { include: { item: true } } } },
        lossRecords: { include: { item: true } },
        custodyTransfersOut: { include: { items: { include: { item: true } } } },
        custodyTransfersIn: { include: { items: { include: { item: true } } } },
      },
    });
    const summary = buildEventItemSummary(event);
    const pendingMap = new Map(summary.map((s) => [s.itemId, s.pending]));

    for (const line of voucher.items) {
      const pending = pendingMap.get(line.itemId) || 0;
      if (pending < line.quantity) {
        throw new AppError(
          `مينفعش تلغي الإذن ده — صنف "${line.item.name}" اتحرّك بعد الإذن ده (اترجع، اتسجل فاقد، أو اتنقل عهدة لحفلة تانية). لازم تلغي أو تعدّل العمليات اللي بعده الأول.`,
          409
        );
      }
    }

    for (const line of voucher.items) {
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: voucher.warehouseId } },
        data: { quantity: { increment: line.quantity } },
      });
    }
    await tx.issueVoucher.update({ where: { id: voucher.id }, data: { status: 'CANCELLED' } });
    await logActivity({
      action: 'DELETE',
      entityType: 'IssueVoucher',
      entityId: voucher.id,
      description: `إلغاء إذن صرف ${voucher.number} — تم إرجاع الكميات للمخزون`,
      userId: req.user.id,
      tx,
    });
  });

  res.json({ success: true, message: 'تم إلغاء الإذن وإرجاع الكميات للمخزون' });
});

/**
 * تعديل إذن صرف كامل — بما فيه إضافة/حذف/تغيير كمية أصناف.
 * النظام بيقارن القديم بالجديد ويعدّل المخزون بالفرق بس (مش بيصفّر ويعيد من الصفر)،
 * فلو زودت كمية بيتخصم الفرق، ولو قللتها أو حذفت صنف بيرجع الفرق للمخزون.
 * body: { recipientName, notes, items: [{ itemId, quantity }] }
 */
const update = asyncHandler(async (req, res) => {
  const { recipientName, notes, vehicles, handedByUserId, receivedByUserId, items = [] } = req.body;
  assertValidQuantities(items);

  const voucher = await runSerializable(async (tx) => {
    const existing = await tx.issueVoucher.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) throw new AppError('إذن الصرف غير موجود', 404);
    if (existing.status === 'CANCELLED') throw new AppError('لا يمكن تعديل إذن ملغي', 400);

    const oldMap = new Map(existing.items.map((i) => [i.itemId, i.quantity]));
    const newMap = new Map(items.map((i) => [i.itemId, Number(i.quantity)]));

    // فحص التوفر لأي زيادة قبل ما نعمل أي تعديل فعلي
    for (const [itemId, newQty] of newMap) {
      const oldQty = oldMap.get(itemId) || 0;
      const delta = newQty - oldQty;
      if (delta > 0) {
        await checkAvailability({ itemId, warehouseId: existing.warehouseId, quantity: delta, tx });
      }
    }

    // فحص أمان: لو بنقلل كمية صنف (أو بنشيله خالص)، لازم نتأكد إنه لسه
    // "برا" فعلاً بنفس القدر — لو جزء منه اتنقل عهدة لحفلة تانية أو
    // اترجع بالفعل، تقليل الكمية هنا هيرجّع للمخزن كمية "وهمية" مش حقيقية
    const allItemIdsCheck = new Set([...oldMap.keys(), ...newMap.keys()]);
    const decreasingItems = Array.from(allItemIdsCheck).filter((itemId) => (newMap.get(itemId) || 0) - (oldMap.get(itemId) || 0) < 0);
    if (decreasingItems.length > 0) {
      const event = await tx.event.findUnique({
        where: { id: existing.eventId },
        include: {
          issueVouchers: { include: { items: { include: { item: true } } } },
          returnVouchers: { include: { items: { include: { item: true } } } },
          lossRecords: { include: { item: true } },
          custodyTransfersOut: { include: { items: { include: { item: true } } } },
          custodyTransfersIn: { include: { items: { include: { item: true } } } },
        },
      });
      const summary = buildEventItemSummary(event);
      const pendingMap = new Map(summary.map((s) => [s.itemId, s.pending]));
      for (const itemId of decreasingItems) {
        const reduceBy = (oldMap.get(itemId) || 0) - (newMap.get(itemId) || 0);
        const pending = pendingMap.get(itemId) || 0;
        if (pending < reduceBy) {
          throw new AppError(
            `مينفعش تقلّل كمية صنف — جزء منه اتحرّك بعد الإذن ده (اترجع، اتسجل فاقد، أو اتنقل عهدة لحفلة تانية). لازم تلغي أو تعدّل العمليات اللي بعده الأول.`,
            409
          );
        }
      }
    }

    // تطبيق الفروقات على المخزون (زيادة تُخصم، نقصان أو حذف يرجع للمخزون)
    const allItemIds = new Set([...oldMap.keys(), ...newMap.keys()]);
    for (const itemId of allItemIds) {
      const oldQty = oldMap.get(itemId) || 0;
      const newQty = newMap.get(itemId) || 0;
      const delta = newQty - oldQty;
      if (delta !== 0) {
        await tx.stockLevel.update({
          where: { itemId_warehouseId: { itemId, warehouseId: existing.warehouseId } },
          data: { quantity: { decrement: delta } }, // delta سالب = increment فعلياً
        });
      }
    }

    await tx.issueVoucherItem.deleteMany({ where: { voucherId: existing.id } });
    const updated = await tx.issueVoucher.update({
      where: { id: existing.id },
      data: {
        ...(recipientName && { recipientName }),
        ...(handedByUserId !== undefined && { handedByUserId: handedByUserId || null }),
        ...(receivedByUserId !== undefined && { receivedByUserId: receivedByUserId || null }),
        ...(vehicles !== undefined && deriveVehicleFields(vehicles)),
        ...(notes !== undefined && { notes }),
        items: { create: items.map((i) => ({ itemId: i.itemId, quantity: Number(i.quantity) })) },
      },
      include: { items: { include: { item: true } } },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'IssueVoucher',
      entityId: updated.id,
      description: `تعديل إذن صرف ${updated.number} (تغيير الأصناف/الكميات)`,
      userId: req.user.id,
      tx,
    });

    return updated;
  });

  res.json({ success: true, data: voucher });
});

module.exports = { list, getOne, create, update, cancel };
