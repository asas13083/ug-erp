const path = require('path');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');
const { buildExcelReport } = require('../services/excelExport');

// ============ فواتير الموردين على الحفلات ============

// GET /api/event-costs/:eventId/suppliers — كل فواتير الموردين على حفلة
const listEventEntries = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const entries = await prisma.eventSupplierEntry.findMany({
    where: { eventId },
    include: { supplier: { select: { id: true, name: true, phone: true } } },
    orderBy: { date: 'asc' },
  });

  const total = entries.reduce((s, e) => s + e.total, 0);
  const paid = entries.reduce((s, e) => s + e.paidAmount, 0);

  res.json({ success: true, data: { entries, total, paid, due: total - paid } });
});

// POST /api/event-costs/:eventId/suppliers — فاتورة مورد جديدة
const createEventEntry = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { supplierId, date, description, count, unitPrice, paidAmount, notes } = req.body;

  if (!supplierId || !date || !description) throw new AppError('المورد والتاريخ والوصف مطلوبين', 400);

  const countNum = Number(count) || 1;
  const priceNum = Number(unitPrice);
  const paidNum = Number(paidAmount) || 0;

  if (!Number.isFinite(priceNum) || priceNum < 0) throw new AppError('السعر لازم يكون رقم غير سالب', 400);
  if (countNum <= 0) throw new AppError('العدد لازم يكون أكبر من صفر', 400);

  const total = countNum * priceNum;
  if (paidNum < 0 || paidNum > total) throw new AppError('المدفوع لازم يكون بين صفر وإجمالي الفاتورة', 400);

  const [event, supplier] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } }),
  ]);
  if (!event) throw new AppError('الحفلة غير موجودة', 404);
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const entry = await prisma.eventSupplierEntry.create({
    data: {
      eventId,
      supplierId,
      date: new Date(date),
      description,
      count: countNum,
      unitPrice: priceNum,
      total,
      paidAmount: paidNum,
      notes,
      userId: req.user.id,
    },
    include: { supplier: { select: { id: true, name: true, phone: true } } },
  });

  await logActivity({
    action: 'CREATE',
    entityType: 'EventSupplierEntry',
    entityId: entry.id,
    description: `فاتورة مورد: ${supplier.name} — ${description} (${total})`,
    userId: req.user.id,
  });

  res.status(201).json({ success: true, data: entry });
});

// PUT /api/event-costs/suppliers/:id — تعديل فاتورة
const updateEventEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { supplierId, date, description, count, unitPrice, paidAmount, notes } = req.body;

  const existing = await prisma.eventSupplierEntry.findUnique({ where: { id } });
  if (!existing) throw new AppError('الفاتورة غير موجودة', 404);

  const countNum = count != null ? Number(count) : existing.count;
  const priceNum = unitPrice != null ? Number(unitPrice) : existing.unitPrice;
  const total = countNum * priceNum;
  const paidNum = paidAmount != null ? Number(paidAmount) : existing.paidAmount;

  if (countNum <= 0) throw new AppError('العدد لازم يكون أكبر من صفر', 400);
  if (!Number.isFinite(priceNum) || priceNum < 0) throw new AppError('السعر لازم يكون رقم غير سالب', 400);
  if (paidNum < 0 || paidNum > total) throw new AppError('المدفوع لازم يكون بين صفر وإجمالي الفاتورة', 400);

  const entry = await prisma.eventSupplierEntry.update({
    where: { id },
    data: {
      ...(supplierId && { supplierId }),
      ...(date && { date: new Date(date) }),
      ...(description && { description }),
      count: countNum,
      unitPrice: priceNum,
      total,
      paidAmount: paidNum,
      ...(notes !== undefined && { notes }),
    },
    include: { supplier: { select: { id: true, name: true, phone: true } } },
  });

  await logActivity({
    action: 'UPDATE',
    entityType: 'EventSupplierEntry',
    entityId: entry.id,
    description: `تعديل فاتورة مورد: ${entry.supplier.name} — ${entry.description}`,
    userId: req.user.id,
  });

  res.json({ success: true, data: entry });
});

// DELETE /api/event-costs/suppliers/:id — حذف فاتورة
const deleteEventEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await prisma.eventSupplierEntry.findUnique({ where: { id }, include: { supplier: true } });
  if (!entry) throw new AppError('الفاتورة غير موجودة', 404);

  await prisma.eventSupplierEntry.delete({ where: { id } });

  await logActivity({
    action: 'DELETE',
    entityType: 'EventSupplierEntry',
    entityId: id,
    description: `حذف فاتورة مورد: ${entry.supplier.name} — ${entry.description}`,
    userId: req.user.id,
  });

  res.json({ success: true, message: 'تم حذف الفاتورة' });
});

// ============ ملف المورد ============

// GET /api/suppliers/:id/profile — ملف المورد الكامل
const getSupplierProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const [entries, payments] = await Promise.all([
    prisma.eventSupplierEntry.findMany({
      where: { supplierId: id },
      include: { event: { select: { id: true, name: true, number: true, startDate: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: id },
      include: { user: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  const totalInvoiced = entries.reduce((s, e) => s + e.total, 0);
  // المدفوع = اللي اتدفع مع الفواتير نفسها + الدفعات اللاحقة المنفصلة
  const paidWithInvoices = entries.reduce((s, e) => s + e.paidAmount, 0);
  const separatePayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = paidWithInvoices + separatePayments;

  // تجميع الفواتير حسب الحفلة — عشان نعرض "كل حفلة اتعامل فيها + إجماليها"
  const byEvent = new Map();
  entries.forEach((e) => {
    const key = e.eventId;
    if (!byEvent.has(key)) {
      byEvent.set(key, { event: e.event, total: 0, paid: 0, count: 0 });
    }
    const row = byEvent.get(key);
    row.total += e.total;
    row.paid += e.paidAmount;
    row.count += 1;
  });

  res.json({
    success: true,
    data: {
      supplier,
      entries,
      payments,
      events: Array.from(byEvent.values()),
      totalInvoiced,
      totalPaid,
      due: totalInvoiced - totalPaid,
    },
  });
});

// GET /api/suppliers/with-balances — قايمة الموردين مع المستحق لكل واحد
const listWithBalances = asyncHandler(async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });

  const [allEntries, allPayments] = await Promise.all([
    prisma.eventSupplierEntry.groupBy({
      by: ['supplierId'],
      _sum: { total: true, paidAmount: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      _sum: { amount: true },
    }),
  ]);

  const entryMap = new Map(allEntries.map((e) => [e.supplierId, e._sum]));
  const paymentMap = new Map(allPayments.map((p) => [p.supplierId, p._sum.amount || 0]));

  const data = suppliers.map((s) => {
    const sums = entryMap.get(s.id) || { total: 0, paidAmount: 0 };
    const totalInvoiced = sums.total || 0;
    const totalPaid = (sums.paidAmount || 0) + (paymentMap.get(s.id) || 0);
    return {
      ...s,
      totalInvoiced,
      totalPaid,
      due: totalInvoiced - totalPaid,
    };
  });

  res.json({ success: true, data });
});

// ============ دفعات الموردين ============

// POST /api/suppliers/:id/payments — تسجيل دفعة
const createPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, date, notes } = req.body;

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) throw new AppError('مبلغ الدفعة لازم يكون أكبر من صفر', 400);
  if (!date) throw new AppError('تاريخ الدفعة مطلوب', 400);

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const payment = await prisma.supplierPayment.create({
    data: { supplierId: id, amount: amountNum, date: new Date(date), notes, userId: req.user.id },
    include: { user: { select: { fullName: true } } },
  });

  await logActivity({
    action: 'CREATE',
    entityType: 'SupplierPayment',
    entityId: payment.id,
    description: `دفعة لمورد: ${supplier.name} — ${amountNum}`,
    userId: req.user.id,
  });

  res.status(201).json({ success: true, data: payment });
});

// DELETE /api/suppliers/payments/:id — حذف دفعة
const deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await prisma.supplierPayment.findUnique({ where: { id }, include: { supplier: true } });
  if (!payment) throw new AppError('الدفعة غير موجودة', 404);

  await prisma.supplierPayment.delete({ where: { id } });

  await logActivity({
    action: 'DELETE',
    entityType: 'SupplierPayment',
    entityId: id,
    description: `حذف دفعة لمورد: ${payment.supplier.name} — ${payment.amount}`,
    userId: req.user.id,
  });

  res.json({ success: true, message: 'تم حذف الدفعة' });
});

// ============ التصدير ============

// GET /api/suppliers/:id/export-excel — ملف المورد كـExcel
const exportSupplierExcel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const [entries, payments] = await Promise.all([
    prisma.eventSupplierEntry.findMany({
      where: { supplierId: id },
      include: { event: { select: { name: true, number: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.supplierPayment.findMany({ where: { supplierId: id }, orderBy: { date: 'desc' } }),
  ]);

  const rows = [];
  const highlightRows = [];

  entries.forEach((e) => {
    rows.push([
      'فاتورة',
      new Date(e.date).toLocaleDateString('ar-EG'),
      e.event?.name || '—',
      e.description,
      e.count,
      e.unitPrice,
      e.total,
      e.paidAmount,
      e.total - e.paidAmount,
    ]);
  });

  payments.forEach((p) => {
    rows.push(['دفعة', new Date(p.date).toLocaleDateString('ar-EG'), '—', p.notes || 'دفعة عامة', '—', '—', '—', p.amount, '—']);
  });

  const totalInvoiced = entries.reduce((s, e) => s + e.total, 0);
  const totalPaid = entries.reduce((s, e) => s + e.paidAmount, 0) + payments.reduce((s, p) => s + p.amount, 0);

  highlightRows.push(rows.length);
  rows.push(['الإجمالي', '', '', '', '', '', totalInvoiced, totalPaid, totalInvoiced - totalPaid]);

  const buffer = await buildExcelReport(
    `كشف حساب مورد — ${supplier.name}`,
    ['النوع', 'التاريخ', 'الحفلة', 'الوصف', 'العدد', 'السعر', 'الإجمالي', 'المدفوع', 'المتبقي'],
    rows,
    { highlightRows }
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="supplier-${supplier.id}.xlsx"`);
  res.send(buffer);
});

// GET /api/event-costs/:eventId/suppliers/export-excel — موردين حفلة كـExcel
const exportEventSuppliersExcel = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { client: true } });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  const entries = await prisma.eventSupplierEntry.findMany({
    where: { eventId },
    include: { supplier: { select: { name: true, phone: true } } },
    orderBy: { date: 'asc' },
  });

  const rows = entries.map((e) => [
    e.supplier.name,
    new Date(e.date).toLocaleDateString('ar-EG'),
    e.description,
    e.count,
    e.unitPrice,
    e.total,
    e.paidAmount,
    e.total - e.paidAmount,
  ]);

  const total = entries.reduce((s, e) => s + e.total, 0);
  const paid = entries.reduce((s, e) => s + e.paidAmount, 0);

  const highlightRows = [rows.length];
  rows.push(['الإجمالي', '', '', '', '', total, paid, total - paid]);

  const eventLogoPath = event.logoUrl ? path.join(__dirname, '../..', event.logoUrl.replace(/^\//, '')) : undefined;

  const buffer = await buildExcelReport(
    `موردين حفلة — ${event.name} (${event.number})`,
    ['المورد', 'التاريخ', 'الوصف', 'العدد', 'السعر', 'الإجمالي', 'المدفوع', 'المتبقي'],
    rows,
    { highlightRows, eventLogoPath }
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="event-suppliers-${event.number}.xlsx"`);
  res.send(buffer);
});

module.exports = {
  listEventEntries,
  createEventEntry,
  updateEventEntry,
  deleteEventEntry,
  getSupplierProfile,
  listWithBalances,
  createPayment,
  deletePayment,
  exportSupplierExcel,
  exportEventSuppliersExcel,
};
