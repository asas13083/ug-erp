const prisma = require('../lib/prisma');
const { AppError } = require('../utils/errors');

/**
 * يتأكد إن الكمية المطلوبة من صنف معين متاحة فعلاً في مخزن معين،
 * مع الأخذ في الاعتبار الكميات المحجوزة لحفلات تانية (Reservation).
 * الكمية "الحرة" الفعلية = quantity - reservedQty
 */
async function checkAvailability({ itemId, warehouseId, quantity, tx = prisma }) {
  const stock = await tx.stockLevel.findUnique({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    include: { item: true },
  });

  const available = stock ? stock.quantity - stock.reservedQty : 0;

  if (available < quantity) {
    const itemName = stock?.item?.name || itemId;
    throw new AppError(
      `الكمية غير كافية من "${itemName}" — المتاح فعلياً ${available} فقط (بعد خصم المحجوز)، والمطلوب ${quantity}`,
      409
    );
  }

  return stock;
}

/** يخصم كمية من مخزن معين (عند الصرف) */
async function decreaseStock({ itemId, warehouseId, quantity, tx = prisma }) {
  await checkAvailability({ itemId, warehouseId, quantity, tx });

  return tx.stockLevel.update({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    data: { quantity: { decrement: quantity } },
  });
}

/** يضيف كمية لمخزن معين (عند المرتجع أو الإضافة الجديدة) */
async function increaseStock({ itemId, warehouseId, quantity, tx = prisma }) {
  return tx.stockLevel.upsert({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    update: { quantity: { increment: quantity } },
    create: { itemId, warehouseId, quantity, reservedQty: 0 },
  });
}

/**
 * يفحص إن حجز أصناف لحفلة جديدة (تواريخ متداخلة) مش هيتعارض
 * مع حجوزات حفلات تانية على نفس الصنف في نفس الفترة.
 * دي أهم نقطة أُضيفت للنظام لمنع الحجز المزدوج لنفس المعدة.
 */
async function checkReservationConflict({ itemId, warehouseId, quantity, startDate, endDate, excludeEventId, tx = prisma }) {
  const overlappingReservations = await tx.reservation.findMany({
    where: {
      itemId,
      eventId: excludeEventId ? { not: excludeEventId } : undefined,
      event: {
        status: { in: ['PLANNED', 'ONGOING'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } }, // تداخل في التواريخ
        ],
      },
    },
    include: { event: true },
  });

  const totalReserved = overlappingReservations.reduce((sum, r) => sum + r.quantity, 0);

  const stock = await tx.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId, warehouseId } } });
  const totalStock = stock?.quantity || 0;
  const freeAfterOtherReservations = totalStock - totalReserved;

  if (freeAfterOtherReservations < quantity) {
    const conflictingEvents = overlappingReservations.map((r) => r.event.name).join('، ');
    throw new AppError(
      `الكمية المطلوبة محجوزة بالفعل لحفلات أخرى بتواريخ متداخلة (${conflictingEvents || 'حفلة أخرى'}). المتاح: ${Math.max(freeAfterOtherReservations, 0)}`,
      409
    );
  }
}

module.exports = { checkAvailability, decreaseStock, increaseStock, checkReservationConflict };
