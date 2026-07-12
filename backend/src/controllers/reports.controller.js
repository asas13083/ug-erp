const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { buildExcelReport } = require('../services/excelExport');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { buildEventItemSummary } = require('../services/eventSettlement');
const { getEventScope } = require('../utils/eventScope');
const { AppError } = require('../utils/errors');

function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.xlsx"`);
  res.send(buffer);
}

const stockExcel = asyncHandler(async (req, res) => {
  const items = await prisma.item.findMany({ where: { isActive: true }, include: { category: true, stockLevels: { where: { warehouse: { deletedAt: null } } } } });
  const rows = items.map((i) => {
    const total = i.stockLevels.reduce((s, x) => s + x.quantity, 0);
    const reserved = i.stockLevels.reduce((s, x) => s + x.reservedQty, 0);
    return [i.code, i.name, i.category?.name, total, total - reserved, i.minQuantity];
  });
  const buffer = await buildExcelReport('تقرير رصيد المخزون', ['الكود', 'الصنف', 'التصنيف', 'الكمية الكلية', 'المتاح', 'الحد الأدنى'], rows);
  sendXlsx(res, 'تقرير-رصيد-المخزون', buffer);
});

const eventsExcel = asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({ include: { client: true } });
  const rows = events.map((e) => [e.number, e.name, e.client?.name, e.location, e.startDate.toLocaleDateString('ar-EG'), e.endDate.toLocaleDateString('ar-EG'), e.status]);
  const buffer = await buildExcelReport('تقرير الحفلات', ['الرقم', 'اسم الحفلة', 'العميل', 'المكان', 'البداية', 'النهاية', 'الحالة'], rows);
  sendXlsx(res, 'تقرير-الحفلات', buffer);
});

const warehousesExcel = asyncHandler(async (req, res) => {
  const stock = await prisma.stockLevel.findMany({ where: { item: { isActive: true } }, include: { item: { include: { category: true } }, warehouse: true } });
  const rows = stock.map((s) => [s.warehouse.name, s.item.name, s.item.category?.name, s.quantity, s.reservedQty]);
  const buffer = await buildExcelReport('تقرير حركة المخازن', ['المخزن', 'الصنف', 'التصنيف', 'الكمية', 'المحجوز'], rows);
  sendXlsx(res, 'تقرير-حركة-المخازن', buffer);
});

const issueVouchersExcel = asyncHandler(async (req, res) => {
  const { warehouseId, eventId } = req.query;
  const where = { ...(warehouseId && { warehouseId }), ...(eventId && { eventId }), ...buildDateRangeFilter(req) };
  const vouchers = await prisma.issueVoucher.findMany({ where, include: { event: true, warehouse: true, items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } });
  const rows = vouchers.map((v) => [v.number, v.event?.name, v.warehouse?.name, v.recipientName, v.items.map((i) => `${i.item.name} ×${i.quantity}`).join(', '), v.createdAt.toLocaleString('ar-EG'), v.status === 'CANCELLED' ? 'ملغى' : 'فعّال']);
  const buffer = await buildExcelReport('تقرير أذون الصرف', ['رقم الإذن', 'الحفلة', 'المخزن', 'المستلم', 'الأصناف', 'التاريخ', 'الحالة'], rows);
  sendXlsx(res, 'تقرير-أذون-الصرف', buffer);
});

const returnVouchersExcel = asyncHandler(async (req, res) => {
  const { warehouseId, eventId } = req.query;
  const where = { ...(warehouseId && { warehouseId }), ...(eventId && { eventId }), ...buildDateRangeFilter(req) };
  const vouchers = await prisma.returnVoucher.findMany({ where, include: { event: true, items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } });
  const rows = vouchers.map((v) => [
    v.number,
    v.event?.name,
    v.items.map((i) => `${i.item.name}: سليم ${i.returnedQuantity}، تالف ${i.damagedQuantity}، مفقود ${i.lostQuantity}`).join(' | '),
    v.createdAt.toLocaleString('ar-EG'),
    v.status === 'CANCELLED' ? 'ملغى' : 'فعّال',
  ]);
  const buffer = await buildExcelReport('تقرير أذون المرتجع', ['رقم الإذن', 'الحفلة', 'التفاصيل', 'التاريخ', 'الحالة'], rows);
  sendXlsx(res, 'تقرير-أذون-المرتجع', buffer);
});

const lossExcel = asyncHandler(async (req, res) => {
  const { warehouseId, eventId, reason } = req.query;
  const where = { ...(warehouseId && { warehouseId }), ...(eventId && { eventId }), ...(reason && { reason }), ...buildDateRangeFilter(req) };
  const records = await prisma.lossRecord.findMany({ where, include: { item: true, event: true, user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } });
  const REASON_LABELS = { DAMAGED: 'تلف', LOST: 'مفقود', THEFT: 'سرقة', OTHER: 'أخرى' };
  const rows = records.map((r) => [r.item?.name, REASON_LABELS[r.reason], r.quantity, r.event?.name || '—', r.user?.fullName, r.createdAt.toLocaleString('ar-EG'), r.status === 'CANCELLED' ? 'ملغى' : 'فعّال']);
  const buffer = await buildExcelReport('تقرير الفاقد', ['الصنف', 'السبب', 'الكمية', 'الحفلة', 'المسؤول', 'التاريخ', 'الحالة'], rows);
  sendXlsx(res, 'تقرير-الفاقد', buffer);
});

const activityLogExcel = asyncHandler(async (req, res) => {
  const { action, entityType } = req.query;
  const where = { ...(action && { action }), ...(entityType && { entityType }), ...buildDateRangeFilter(req) };
  const logs = await prisma.activityLog.findMany({ where, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 2000 });
  const rows = logs.map((l) => [l.action, l.description, l.user?.fullName, l.createdAt.toLocaleString('ar-EG')]);
  const buffer = await buildExcelReport('سجل الحركة الكامل', ['العملية', 'الوصف', 'المستخدم', 'التاريخ'], rows);
  sendXlsx(res, 'تقرير-سجل-الحركة', buffer);
});

module.exports = { stockExcel, eventsExcel, warehousesExcel, issueVouchersExcel, returnVouchersExcel, lossExcel, activityLogExcel };

// GET /api/reports/warehouse/:id.xlsx — رصيد مخزن واحد بالتفصيل
const warehouseDetailExcel = asyncHandler(async (req, res) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
  const stock = await prisma.stockLevel.findMany({
    where: { warehouseId: req.params.id, item: { isActive: true } },
    include: { item: { include: { category: true } } },
    orderBy: { item: { name: 'asc' } },
  });
  const rows = stock.map((s) => [s.item.code, s.item.name, s.item.category?.name, s.quantity, s.reservedQty, s.quantity - s.reservedQty]);
  const buffer = await buildExcelReport(`رصيد مخزن ${warehouse?.name || ''}`, ['الكود', 'الصنف', 'التصنيف', 'الكمية', 'محجوز', 'المتاح'], rows);
  sendXlsx(res, `مخزن-${warehouse?.name || 'تقرير'}`, buffer);
});

// GET /api/reports/event/:id.xlsx — كل حركة حفلة بعينها
const eventDetailExcel = asyncHandler(async (req, res) => {
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(req.params.id)) throw new AppError('غير مسموح لك بالوصول لتقرير هذه الحفلة', 403);
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      issueVouchers: { include: { items: { include: { item: true } } } },
      returnVouchers: { include: { items: { include: { item: true } } } },
      lossRecords: { include: { item: true } },
    },
  });
  const summary = buildEventItemSummary(event);
  const summaryRows = summary.map((s) => [
    s.itemName,
    s.issued,
    s.returnedGood,
    s.damaged,
    s.lost,
    s.pending,
    s.settled ? 'اتقفل بالكامل' : 'لسه معلّق',
  ]);
  const summaryBuffer = await buildExcelReport(
    `ملخص أصناف حفلة ${event.name}`,
    ['الصنف', 'خرج', 'رجع سليم', 'تالف', 'فاقد', 'لسه برا', 'الحالة'],
    summaryRows
  );

  const rows = [];
  event.issueVouchers.forEach((v) => v.items.forEach((i) => rows.push(['صرف', v.number, i.item.name, i.quantity, '', v.createdAt.toLocaleDateString('ar-EG')])));
  event.returnVouchers.forEach((v) =>
    v.items.forEach((i) => rows.push(['مرتجع', v.number, i.item.name, i.returnedQuantity, `تالف ${i.damagedQuantity} / فاقد ${i.lostQuantity}`, v.createdAt.toLocaleDateString('ar-EG')]))
  );
  event.lossRecords.forEach((l) => rows.push(['فاقد', '—', l.item.name, l.quantity, l.reason, l.createdAt.toLocaleDateString('ar-EG')]));
  const buffer = await buildExcelReport(`تفاصيل حفلة ${event.name}`, ['النوع', 'رقم الإذن', 'الصنف', 'الكمية', 'ملاحظات', 'التاريخ'], rows);

  // نبعت شيت الملخص كملف منفصل الأول (الأهم)، والتفاصيل الكاملة في نفس الطلب مش هينفع في ملف واحد
  // بسيط، فبنبعت الملخص كتقرير رئيسي والتفاصيل الكاملة موجودة في تقرير "سجل الحركة"
  sendXlsx(res, `حفلة-${event.name}`, summaryBuffer);
});

// GET /api/reports/event/:id/full.xlsx — نفس تقرير الحفلة بس بكل التفاصيل الخام (مش الملخص)
const eventDetailFullExcel = asyncHandler(async (req, res) => {
  const scope = await getEventScope(req.user.id);
  if (scope && !scope.includes(req.params.id)) throw new AppError('غير مسموح لك بالوصول لتقرير هذه الحفلة', 403);
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      issueVouchers: { include: { items: { include: { item: true } } } },
      returnVouchers: { include: { items: { include: { item: true } } } },
      lossRecords: { include: { item: true } },
    },
  });
  const rows = [];
  event.issueVouchers.forEach((v) => v.items.forEach((i) => rows.push(['صرف', v.number, i.item.name, i.quantity, '', v.createdAt.toLocaleDateString('ar-EG')])));
  event.returnVouchers.forEach((v) =>
    v.items.forEach((i) => rows.push(['مرتجع', v.number, i.item.name, i.returnedQuantity, `تالف ${i.damagedQuantity} / فاقد ${i.lostQuantity}`, v.createdAt.toLocaleDateString('ar-EG')]))
  );
  event.lossRecords.forEach((l) => rows.push(['فاقد', '—', l.item.name, l.quantity, l.reason, l.createdAt.toLocaleDateString('ar-EG')]));
  const buffer = await buildExcelReport(`تفاصيل حفلة ${event.name} (كامل)`, ['النوع', 'رقم الإذن', 'الصنف', 'الكمية', 'ملاحظات', 'التاريخ'], rows);
  sendXlsx(res, `حفلة-${event.name}-كامل`, buffer);
});

// GET /api/reports/client/:id.xlsx — كل حفلات عميل بعينه
const clientDetailExcel = asyncHandler(async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id }, include: { events: true } });
  const rows = client.events.map((e) => [e.number, e.name, e.location, e.startDate.toLocaleDateString('ar-EG'), e.endDate.toLocaleDateString('ar-EG'), e.status]);
  const buffer = await buildExcelReport(`حفلات العميل ${client.name}`, ['الرقم', 'اسم الحفلة', 'المكان', 'البداية', 'النهاية', 'الحالة'], rows);
  sendXlsx(res, `عميل-${client.name}`, buffer);
});

module.exports.warehouseDetailExcel = warehouseDetailExcel;
module.exports.eventDetailExcel = eventDetailExcel;
module.exports.eventDetailFullExcel = eventDetailFullExcel;
module.exports.clientDetailExcel = clientDetailExcel;

// GET /api/reports/warehouse/:id/issued.xlsx — كل أذون الصرف الخاصة بمخزن بعينه
const warehouseIssuedExcel = asyncHandler(async (req, res) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
  const vouchers = await prisma.issueVoucher.findMany({
    where: { warehouseId: req.params.id },
    include: { event: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const rows = vouchers.map((v) => [v.number, v.event?.name, v.recipientName, v.items.map((i) => `${i.item.name} ×${i.quantity}`).join(', '), v.status, v.createdAt.toLocaleString('ar-EG')]);
  const buffer = await buildExcelReport(`تقرير الصرف — مخزن ${warehouse?.name || ''}`, ['رقم الإذن', 'الحفلة', 'المستلم', 'الأصناف', 'الحالة', 'التاريخ'], rows);
  sendXlsx(res, `صرف-مخزن-${warehouse?.name || 'تقرير'}`, buffer);
});

// GET /api/reports/warehouse/:id/lost.xlsx — كل الفاقد الخاص بمخزن بعينه
const warehouseLostExcel = asyncHandler(async (req, res) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
  const records = await prisma.lossRecord.findMany({
    where: { warehouseId: req.params.id },
    include: { item: true, event: true, user: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const REASON_LABELS = { DAMAGED: 'تلف', LOST: 'مفقود', THEFT: 'سرقة', OTHER: 'أخرى' };
  const rows = records.map((r) => [r.item?.name, REASON_LABELS[r.reason], r.quantity, r.event?.name || '—', r.user?.fullName, r.createdAt.toLocaleString('ar-EG')]);
  const buffer = await buildExcelReport(`تقرير الفاقد — مخزن ${warehouse?.name || ''}`, ['الصنف', 'السبب', 'الكمية', 'الحفلة', 'المسؤول', 'التاريخ'], rows);
  sendXlsx(res, `فاقد-مخزن-${warehouse?.name || 'تقرير'}`, buffer);
});

module.exports.warehouseIssuedExcel = warehouseIssuedExcel;
module.exports.warehouseLostExcel = warehouseLostExcel;

// GET /api/reports/category/:id.xlsx — كل أصناف تصنيف معين
const categoryDetailExcel = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  const items = await prisma.item.findMany({
    where: { categoryId: req.params.id, isActive: true },
    include: { stockLevels: { where: { warehouse: { deletedAt: null } }, include: { warehouse: true } } },
  });
  const rows = items.map((i) => {
    const total = i.stockLevels.reduce((s, x) => s + x.quantity, 0);
    const locations = i.stockLevels.filter((s) => s.quantity > 0).map((s) => `${s.warehouse.name} (${s.quantity})`).join(', ');
    return [i.code, i.name, i.unit, total, i.minQuantity, locations || '—'];
  });
  const buffer = await buildExcelReport(`أصناف تصنيف ${category?.name || ''}`, ['الكود', 'الصنف', 'الوحدة', 'الكمية الكلية', 'الحد الأدنى', 'أماكن التخزين'], rows);
  sendXlsx(res, `تصنيف-${category?.name || 'تقرير'}`, buffer);
});

module.exports.categoryDetailExcel = categoryDetailExcel;

// GET /api/reports/stock-counts.xlsx?warehouseId=&dateFrom=&dateTo=
const stockCountsExcel = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const where = { ...(warehouseId && { warehouseId }), ...buildDateRangeFilter(req) };
  const counts = await prisma.stockCount.findMany({
    where,
    include: { warehouse: true, user: { select: { fullName: true } }, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = counts.flatMap((c) =>
    c.items.map((i) => [
      c.number,
      c.warehouse?.name || '—',
      i.item.name,
      i.systemQuantity,
      i.actualQuantity,
      i.difference,
      c.user?.fullName || '—',
      c.createdAt.toLocaleString('ar-EG'),
    ])
  );
  const buffer = await buildExcelReport('تقرير الجرد', ['رقم الجرد', 'المخزن', 'الصنف', 'الرصيد بالنظام', 'الكمية الفعلية', 'الفرق', 'المسؤول', 'التاريخ'], rows);
  sendXlsx(res, 'تقرير-الجرد', buffer);
});

module.exports.stockCountsExcel = stockCountsExcel;

// GET /api/reports/stock-transfers.xlsx?dateFrom=&dateTo=
const stockTransfersExcel = asyncHandler(async (req, res) => {
  const where = { ...buildDateRangeFilter(req) };
  const transfers = await prisma.stockTransfer.findMany({
    where,
    include: { fromWarehouse: true, toWarehouse: true, user: { select: { fullName: true } }, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = transfers.flatMap((t) =>
    t.items.map((i) => [t.number, t.fromWarehouse?.name || '—', t.toWarehouse?.name || '—', i.item.name, i.quantity, t.user?.fullName || '—', t.createdAt.toLocaleString('ar-EG')])
  );
  const buffer = await buildExcelReport('تقرير النقل بين المخازن', ['رقم العملية', 'من مخزن', 'إلى مخزن', 'الصنف', 'الكمية', 'المسؤول', 'التاريخ'], rows);
  sendXlsx(res, 'تقرير-النقل-بين-المخازن', buffer);
});

module.exports.stockTransfersExcel = stockTransfersExcel;

// GET /api/reports/custody-transfers.xlsx?dateFrom=&dateTo=
const custodyTransfersExcel = asyncHandler(async (req, res) => {
  const where = { ...buildDateRangeFilter(req) };
  const transfers = await prisma.custodyTransfer.findMany({
    where,
    include: { fromEvent: true, toEvent: true, user: { select: { fullName: true } }, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const rows = transfers.flatMap((t) =>
    t.items.map((i) => [t.number, t.fromEvent?.name || '—', t.toEvent?.name || '—', i.item.name, i.quantity, t.receiverName, t.transportInfo || '—', t.createdAt.toLocaleString('ar-EG')])
  );
  const buffer = await buildExcelReport(
    'تقرير نقل العهدة بين الحفلات',
    ['رقم العملية', 'من حفلة', 'إلى حفلة', 'الصنف', 'الكمية', 'المستلم', 'بيانات النقل', 'التاريخ'],
    rows
  );
  sendXlsx(res, 'تقرير-نقل-العهدة', buffer);
});

module.exports.custodyTransfersExcel = custodyTransfersExcel;

// GET /api/reports/transport-log.xlsx?dateFrom=&dateTo=
const TYPE_LABELS_AR = { ISSUE: 'إذن صرف', RETURN: 'إذن مرتجع', CUSTODY: 'نقل عهدة' };
const STATUS_LABELS_AR = { CONFIRMED: 'فعّال', CANCELLED: 'ملغى' };
const transportLogExcel = asyncHandler(async (req, res) => {
  const { fetchTransportLog } = require('./transportLog.controller');
  const rows = await fetchTransportLog(req);
  const dataRows = rows.map((r) => [
    TYPE_LABELS_AR[r.type],
    r.number,
    r.eventName,
    r.responsible,
    r.vehicleCount || '—',
    r.transportInfo || '—',
    STATUS_LABELS_AR[r.status] || r.status,
    r.createdAt.toLocaleString('ar-EG'),
  ]);
  const buffer = await buildExcelReport(
    'سجل النقل (السيارات)',
    ['النوع', 'رقم الإذن', 'الحفلة', 'المسؤول', 'عدد السيارات', 'بيانات النقل', 'الحالة', 'التاريخ'],
    dataRows
  );
  sendXlsx(res, 'سجل-النقل', buffer);
});

module.exports.transportLogExcel = transportLogExcel;

// GET /api/reports/damaged.xlsx — كل الأصناف التالفة المسجّلة من أذون المرتجع
const damagedExcel = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const items = await prisma.returnVoucherItem.findMany({
    where: {
      damagedQuantity: { gt: 0 },
      voucher: { ...(warehouseId && { warehouseId }), ...buildDateRangeFilter(req) },
    },
    include: { item: true, voucher: { include: { event: true, warehouse: true, user: { select: { fullName: true } } } } },
    orderBy: { voucher: { createdAt: 'desc' } },
  });
  const rows = items.map((i) => [
    i.voucher.number,
    i.item.name,
    i.damagedQuantity,
    i.voucher.event?.name || '—',
    i.voucher.warehouse?.name || '—',
    i.voucher.user?.fullName || '—',
    i.voucher.createdAt.toLocaleString('ar-EG'),
    i.voucher.status === 'CANCELLED' ? 'ملغى' : 'فعّال',
  ]);
  const buffer = await buildExcelReport('تقرير التالف', ['رقم الإذن', 'الصنف', 'الكمية التالفة', 'الحفلة', 'المخزن', 'المسؤول', 'التاريخ', 'الحالة'], rows);
  sendXlsx(res, 'تقرير-التالف', buffer);
});

module.exports.damagedExcel = damagedExcel;

/**
 * تجميع كل بيانات فترة معينة (يوم أو شهر): عدد كل نوع عملية + التفاصيل الكاملة.
 * بيُستخدم في كل من عرض التقرير في الواجهة وفي تصديره Excel.
 */
async function buildPeriodData({ start, end }) {
  const range = { gte: start, lt: end };

  const [issueVouchers, returnVouchers, lossRecords, newItems, newEvents, newClients, activityLogs, allItems, activeEventsCount] = await Promise.all([
    prisma.issueVoucher.findMany({ where: { createdAt: range }, include: { event: true, warehouse: true, items: { include: { item: true } }, user: { select: { fullName: true } } } }),
    prisma.returnVoucher.findMany({ where: { createdAt: range }, include: { event: true, warehouse: true, items: { include: { item: true } }, user: { select: { fullName: true } } } }),
    prisma.lossRecord.findMany({ where: { createdAt: range }, include: { item: true, event: true, warehouse: true, user: { select: { fullName: true } } } }),
    prisma.item.count({ where: { createdAt: range } }),
    prisma.event.findMany({ where: { createdAt: range }, include: { client: true } }),
    prisma.client.count({ where: { createdAt: range } }),
    prisma.activityLog.findMany({ where: { createdAt: range }, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.item.findMany({ where: { isActive: true }, include: { stockLevels: { where: { warehouse: { deletedAt: null } } } } }),
    prisma.event.count({ where: { status: 'ONGOING' } }), // كام حفلة شغّالة دلوقتي (لحظياً، مش خاص بالفترة)
  ]);

  const totalIssuedQty = issueVouchers.reduce((s, v) => s + v.items.reduce((s2, i) => s2 + i.quantity, 0), 0);
  const totalReturnedQty = returnVouchers.reduce((s, v) => s + v.items.reduce((s2, i) => s2 + i.returnedQuantity, 0), 0);
  const totalDamagedQty = returnVouchers.reduce((s, v) => s + v.items.reduce((s2, i) => s2 + i.damagedQuantity, 0), 0);
  const totalLostQty = lossRecords.reduce((s, l) => s + l.quantity, 0);

  // أصناف وصلت أو قربت من الحد الأدنى — لحظة إصدار التقرير (مش تاريخي)
  const lowStockItems = allItems
    .map((i) => ({ name: i.name, code: i.code, total: i.stockLevels.reduce((s, x) => s + x.quantity, 0), min: i.minQuantity }))
    .filter((i) => i.total <= i.min)
    .sort((a, b) => a.total - b.total);

  return {
    summary: {
      issueVouchersCount: issueVouchers.length,
      totalIssuedQty,
      returnVouchersCount: returnVouchers.length,
      totalReturnedQty,
      totalDamagedQty,
      lossRecordsCount: lossRecords.length,
      totalLostQty,
      newItemsCount: newItems,
      newEventsCount: newEvents.length,
      activeEventsCount,
      newClientsCount: newClients,
      activityCount: activityLogs.length,
    },
    issueVouchers,
    returnVouchers,
    lossRecords,
    newEvents,
    activityLogs,
    lowStockItems,
  };
}

function resolvePeriodRange(type, dateStr) {
  if (type === 'month') {
    const [y, m] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    return { start, end };
  }
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// GET /api/reports/period?type=day|month&date=YYYY-MM-DD أو YYYY-MM
const periodReport = asyncHandler(async (req, res) => {
  const { type = 'day', date } = req.query;
  if (!date) throw new AppError('التاريخ مطلوب', 400);
  const { start, end } = resolvePeriodRange(type, date);
  const data = await buildPeriodData({ start, end });
  res.json({ success: true, data });
});

// GET /api/reports/period.xlsx?type=day|month&date=...
const periodReportExcel = asyncHandler(async (req, res) => {
  const { type = 'day', date } = req.query;
  if (!date) throw new AppError('التاريخ مطلوب', 400);
  const { start, end } = resolvePeriodRange(type, date);
  const data = await buildPeriodData({ start, end });

  const rows = data.activityLogs.map((l) => [l.action, l.description, l.user?.fullName, l.createdAt.toLocaleString('ar-EG')]);
  const label = type === 'month' ? `تقرير شهر ${date}` : `تقرير يوم ${date}`;
  const buffer = await buildExcelReport(label, ['العملية', 'الوصف', 'المستخدم', 'الوقت'], rows);
  sendXlsx(res, `تقرير-${date}`, buffer);
});

module.exports.periodReport = periodReport;
module.exports.periodReportExcel = periodReportExcel;
module.exports.buildPeriodData = buildPeriodData;
module.exports.resolvePeriodRange = resolvePeriodRange;
