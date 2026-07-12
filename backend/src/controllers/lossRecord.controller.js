const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { getEventScope } = require('../utils/eventScope');
const { runSerializable } = require('../utils/serializableTransaction');
const { checkAvailability } = require('../services/stockService');

const list = asyncHandler(async (req, res) => {
  const { itemId, eventId, warehouseId, reason } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);
  const scope = await getEventScope(req.user.id);

  let eventFilter;
  if (eventId) {
    if (scope && !scope.includes(eventId)) throw new AppError('غير مسموح لك بالوصول لفاقد هذه الحفلة', 403);
    eventFilter = eventId;
  } else if (scope) {
    // لو مقيّد ومفيش eventId محدد، يشوف بس فاقد حفلاته + الفاقد اللي مالوش حفلة خالص مش هيبان له
    eventFilter = { in: scope };
  }

  const where = { ...(itemId && { itemId }), ...(eventFilter && { eventId: eventFilter }), ...(warehouseId && { warehouseId }), ...(reason && { reason }), ...buildDateRangeFilter(req) };
  const [records, total] = await Promise.all([
    prisma.lossRecord.findMany({
      where,
      include: { item: true, event: true, warehouse: true, user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.lossRecord.count({ where }),
  ]);
  res.json({ success: true, data: records, meta: buildMeta(page, pageSize, total) });
});

/**
 * تسجيل فاقد يدوي (تلف/سرقة/أخرى) — غير الفاقد التلقائي الناتج عن المرتجع.
 * لو الفاقد ناتج عن تلف في المخزن نفسه (مش أثناء حفلة)، بيتخصم من رصيد المخزون كمان.
 * body: { itemId, warehouseId (اختياري), eventId (اختياري), quantity, reason, description }
 */
const create = asyncHandler(async (req, res) => {
  const { itemId, warehouseId, eventId, quantity, reason, description } = req.body;

  if (!itemId || !quantity || !reason) {
    throw new AppError('الصنف والكمية والسبب حقول مطلوبة', 400);
  }
  if (eventId) {
    const scope = await getEventScope(req.user.id);
    if (scope && !scope.includes(eventId)) {
      throw new AppError('غير مسموح لك بتسجيل فاقد على هذه الحفلة — مش من ضمن الحفلات المعيّن عليها', 403);
    }
  }

  const record = await runSerializable(async (tx) => {
    // لو محدد مخزن، لازم نتأكد إن الكمية دي متاحة فعلاً قبل ما نخصمها —
    // نفس الفحص المستخدم في الصرف والنقل بالظبط، عشان الكمية متنزلش تحت الصفر
    if (warehouseId) {
      await checkAvailability({ itemId, warehouseId, quantity: Number(quantity), tx });
    }

    const created = await tx.lossRecord.create({
      data: { itemId, eventId, warehouseId, quantity, reason, description, userId: req.user.id },
      include: { item: true },
    });

    // لو محدد مخزن، يبقى الفاقد ده من رصيد مخزون فعلي وليس أثناء حفلة، فيتخصم
    if (warehouseId) {
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId, warehouseId } },
        data: { quantity: { decrement: quantity } },
      });
    }

    await logActivity({
      action: 'LOSS',
      entityType: 'LossRecord',
      entityId: created.id,
      description: `تسجيل فاقد: ${created.item.name} ×${quantity} (${reason})`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: record });
});

module.exports = { list, create };

/**
 * تعديل سجل فاقد يدوي (مش المتولّد تلقائياً من مرتجع — ده تعدّله من خلال
 * تعديل إذن المرتجع نفسه بدل ما تعدّله هنا مباشرة).
 * لو الفاقد مرتبط بمخزن، بيعكس الكمية القديمة ويطبّق الجديدة بأمان.
 * body: { quantity, reason, description }
 */
const update = asyncHandler(async (req, res) => {
  const { quantity, reason, description } = req.body;
  if (!quantity || quantity <= 0 || !reason) {
    throw new AppError('الكمية والسبب مطلوبين، والكمية لازم تكون أكبر من صفر', 400);
  }

  const record = await runSerializable(async (tx) => {
    const existing = await tx.lossRecord.findUnique({ where: { id: req.params.id }, include: { item: true } });
    if (!existing) throw new AppError('سجل الفاقد غير موجود', 404);
    if (existing.source !== 'MANUAL') {
      throw new AppError('ده فاقد تلقائي (من مرتجع أو جرد) — عدّل من المصدر نفسه بدل ما تعدّله من هنا مباشرة', 400);
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError('السجل ده ملغى بالفعل، مينفعش تتعدّل', 400);
    }

    if (existing.warehouseId) {
      // نرجّع الكمية القديمة الأول (فعلية وأساسية)، وبعدين نتأكد ونخصم
      // الجديدة — عشان نسمح بتعديل بسيط (زيادة أو نقصان) من غير ما نرفض غلط
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: existing.itemId, warehouseId: existing.warehouseId } },
        data: { quantity: { increment: existing.quantity } },
      });

      await checkAvailability({ itemId: existing.itemId, warehouseId: existing.warehouseId, quantity: Number(quantity), tx });
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: existing.itemId, warehouseId: existing.warehouseId } },
        data: { quantity: { decrement: Number(quantity) } },
      });
    }

    const updated = await tx.lossRecord.update({
      where: { id: existing.id },
      data: { quantity: Number(quantity), reason, description },
      include: { item: true },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'LossRecord',
      entityId: updated.id,
      description: `تعديل سجل فاقد: ${updated.item.name} ×${quantity} (${reason})`,
      userId: req.user.id,
      tx,
    });

    return updated;
  });

  res.json({ success: true, data: record });
});

// DELETE /api/loss-records/:id — إلغاء سجل فاقد يدوي، مع إرجاع الكمية للمخزون لو كانت اتخصمت
const cancel = asyncHandler(async (req, res) => {
  const record = await runSerializable(async (tx) => {
    const existing = await tx.lossRecord.findUnique({ where: { id: req.params.id }, include: { item: true } });
    if (!existing) throw new AppError('سجل الفاقد غير موجود', 404);
    if (existing.source !== 'MANUAL') {
      throw new AppError('ده فاقد تلقائي (من مرتجع أو جرد) — التصحيح يكون من المصدر نفسه مش من هنا مباشرة', 400);
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError('السجل ده ملغى بالفعل', 400);
    }

    if (existing.warehouseId) {
      await tx.stockLevel.update({
        where: { itemId_warehouseId: { itemId: existing.itemId, warehouseId: existing.warehouseId } },
        data: { quantity: { increment: existing.quantity } },
      });
    }

    const updated = await tx.lossRecord.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
    await logActivity({
      action: 'DELETE',
      entityType: 'LossRecord',
      entityId: updated.id,
      description: `إلغاء سجل فاقد: ${existing.item.name} ×${existing.quantity}`,
      userId: req.user.id,
      tx,
    });
    return updated;
  });

  res.json({ success: true, data: record });
});

module.exports.update = update;
module.exports.cancel = cancel;
