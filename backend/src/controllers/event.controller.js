const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { checkReservationConflict } = require('../services/stockService');
const { getPagination, buildMeta } = require('../utils/pagination');
const { computeBulkSettlementStatuses, buildEventItemSummary } = require('../services/eventSettlement');
const { getEventScope } = require('../utils/eventScope');

// GET /api/events/list-for-custody-transfer — كل الحفلات المفتوحة، بدون
// تقييد نطاق المستخدم — عشان يقدر ينقل عهدة لحفلة مش معيّن عليها شخصياً
const listForCustodyTransfer = asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({
    where: { status: { in: ['ONGOING', 'PLANNED'] } },
    select: { id: true, number: true, name: true, startDate: true },
    orderBy: { startDate: 'desc' },
  });
  res.json({ success: true, data: events });
});

const list = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const statusFilter = status ? (status.includes(',') ? { in: status.split(',') } : status) : undefined;
  const scope = await getEventScope(req.user.id);
  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { number: { contains: q, mode: 'insensitive' } }] }),
    ...(scope && { id: { in: scope } }),
  };
  const [events, total] = await Promise.all([
    prisma.event.findMany({ where, include: { client: true, responsible: { select: { fullName: true } } }, orderBy: { startDate: 'desc' }, skip, take }),
    prisma.event.count({ where }),
  ]);

  const settlementMap = await computeBulkSettlementStatuses(events.map((e) => e.id));
  const eventsWithSettlement = events.map((e) => ({ ...e, settlementStatus: settlementMap.get(e.id) || 'none' }));

  res.json({ success: true, data: eventsWithSettlement, meta: buildMeta(page, pageSize, total) });
});

const getOne = asyncHandler(async (req, res) => {
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(req.params.id)) {
    throw new AppError('غير مسموح لك بالوصول لهذه الحفلة — مش من ضمن الحفلات المعيّن عليها', 403);
  }
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      responsible: { select: { fullName: true } },
      assignments: { include: { user: { select: { id: true, fullName: true } } } },
      reservations: { include: { item: true } },
      issueVouchers: { include: { items: { include: { item: true } }, warehouse: true } },
      returnVouchers: { include: { items: { include: { item: true } } } },
      lossRecords: { include: { item: true } },
      custodyTransfersOut: { include: { items: { include: { item: true } }, toEvent: true } },
      custodyTransfersIn: { include: { items: { include: { item: true } }, fromEvent: true } },
    },
  });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);
  const itemsSummary = buildEventItemSummary(event);
  res.json({ success: true, data: { ...event, itemsSummary } });
});

// GET /api/events/:id/assignments — قايمة الأوبريشن المعيّنين على الحفلة
const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await prisma.eventAssignment.findMany({
    where: { eventId: req.params.id },
    include: { user: { select: { id: true, fullName: true, username: true } } },
  });
  res.json({ success: true, data: assignments });
});

// PUT /api/events/:id/assignments — استبدال كل التعيينات دفعة واحدة { userIds: [] }
const setAssignments = asyncHandler(async (req, res) => {
  const { userIds = [] } = req.body;
  await prisma.$transaction(async (tx) => {
    await tx.eventAssignment.deleteMany({ where: { eventId: req.params.id } });
    if (userIds.length > 0) {
      await tx.eventAssignment.createMany({ data: userIds.map((userId) => ({ eventId: req.params.id, userId })) });
    }
    await logActivity({
      action: 'UPDATE',
      entityType: 'Event',
      entityId: req.params.id,
      description: `تحديث تعيين الأوبريشن على الحفلة (${userIds.length} شخص معيّن)`,
      userId: req.user.id,
      tx,
    });
  });
  res.json({ success: true, message: 'تم تحديث التعيينات بنجاح' });
});

/**
 * إنشاء حفلة جديدة + حجز مسبق اختياري لأصناف معينة.
 * body: { name, clientId, location, startDate, endDate, responsibleId, notes,
 *         reservations: [{ itemId, warehouseId, quantity }] }
 */
const create = asyncHandler(async (req, res) => {
  const { name, clientId, location, startDate, endDate, responsibleId, notes, reservations = [], assignedUserIds = [] } = req.body;

  if (!name || !clientId || !startDate || !endDate) {
    throw new AppError('اسم الحفلة والعميل وتاريخ البداية والنهاية حقول مطلوبة', 400);
  }
  if (new Date(startDate) > new Date(endDate)) {
    throw new AppError('تاريخ البداية لازم يكون قبل تاريخ النهاية', 400);
  }

  const event = await prisma.$transaction(async (tx) => {
    const number = await generateCode('event');
    const created = await tx.event.create({
      data: { number, name, clientId, location, startDate: new Date(startDate), endDate: new Date(endDate), responsibleId, notes },
    });

    if (assignedUserIds.length > 0) {
      await tx.eventAssignment.createMany({ data: assignedUserIds.map((userId) => ({ eventId: created.id, userId })) });
    }

    // فحص وإنشاء الحجوزات المسبقة (لو موجودة)
    for (const reservation of reservations) {
      await checkReservationConflict({
        itemId: reservation.itemId,
        warehouseId: reservation.warehouseId,
        quantity: reservation.quantity,
        startDate: created.startDate,
        endDate: created.endDate,
        tx,
      });
      await tx.reservation.create({ data: { eventId: created.id, itemId: reservation.itemId, quantity: reservation.quantity } });
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: reservation.itemId, warehouseId: reservation.warehouseId } },
        data: { reservedQty: { increment: reservation.quantity } },
      });
    }

    await logActivity({
      action: 'CREATE',
      entityType: 'Event',
      entityId: created.id,
      description: `إنشاء حفلة جديدة: ${created.name} (${created.number})`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: event });
});

const update = asyncHandler(async (req, res) => {
  const { name, location, startDate, endDate, status, responsibleId, notes, expectedBudget } = req.body;
  const event = await prisma.$transaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: req.params.id }, include: { reservations: true } });
    if (!existing) throw new AppError('الحفلة غير موجودة', 404);

    const updated = await tx.event.update({
      where: { id: req.params.id },
      data: {
        name,
        location,
        status,
        responsibleId,
        notes,
        ...(expectedBudget !== undefined && { expectedBudget: expectedBudget === '' || expectedBudget === null ? null : Number(expectedBudget) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    // لو الحفلة اتلغت دلوقتي (ومكنتش ملغاة قبل كده)، لازم نحرر أي حجوزات
    // مسبقة عليها فوراً — غير كده الكمية دي هتفضل "مقفولة" ع المخزون للأبد
    // وتمنع حفلات تانية تحجزها غلط
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      for (const r of existing.reservations) {
        const stockLevels = await tx.stockLevel.findMany({ where: { itemId: r.itemId } });
        const target = stockLevels.find((s) => s.reservedQty >= r.quantity) || stockLevels[0];
        if (target) {
          await tx.stockLevel.update({
            where: { itemId_warehouseId: { itemId: r.itemId, warehouseId: target.warehouseId } },
            data: { reservedQty: { decrement: Math.min(r.quantity, target.reservedQty) } },
          });
        }
      }
      await tx.reservation.deleteMany({ where: { eventId: existing.id } });
    }

    await logActivity({
      action: 'UPDATE',
      entityType: 'Event',
      entityId: updated.id,
      description: `تعديل حفلة: ${updated.name}`,
      userId: req.user.id,
      tx,
    });
    return updated;
  });
  res.json({ success: true, data: event });
});

const remove = asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { issueVouchers: true, returnVouchers: true, reservations: true },
  });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  if (event.issueVouchers.length > 0 || event.returnVouchers.length > 0) {
    throw new AppError('لا يمكن حذف حفلة تم تسجيل أذون صرف أو مرتجع عليها بالفعل — يمكنك تغيير حالتها إلى "ملغاة" بدلاً من ذلك', 409);
  }

  await prisma.$transaction(async (tx) => {
    // تحرير أي حجوزات مسبقة قبل الحذف
    for (const r of event.reservations) {
      const stockLevels = await tx.stockLevel.findMany({ where: { itemId: r.itemId } });
      // نحرر الحجز من أول مخزن فيه رصيد محجوز كافي (الأغلب مخزن واحد للصنف)
      const target = stockLevels.find((s) => s.reservedQty >= r.quantity) || stockLevels[0];
      if (target) {
        await tx.stockLevel.update({
          where: { itemId_warehouseId: { itemId: r.itemId, warehouseId: target.warehouseId } },
          data: { reservedQty: { decrement: Math.min(r.quantity, target.reservedQty) } },
        });
      }
    }
    await tx.reservation.deleteMany({ where: { eventId: event.id } });
    await tx.event.delete({ where: { id: event.id } });
    await logActivity({
      action: 'DELETE',
      entityType: 'Event',
      entityId: event.id,
      description: `حذف حفلة: ${event.name} (${event.number})`,
      userId: req.user.id,
      tx,
    });
  });

  res.json({ success: true, message: 'تم حذف الحفلة بنجاح' });
});

module.exports = { list, getOne, create, update, remove, listAssignments, setAssignments, listForCustodyTransfer };
