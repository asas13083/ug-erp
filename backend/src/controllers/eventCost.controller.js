const path = require('path');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');
const { buildExcelReport } = require('../services/excelExport');

function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.xlsx"`);
  res.send(buffer);
}

const CATEGORY_LABELS = {
  DECOR_LABOR: 'عمالة الديكور',
  UNIFORMS: 'البدلات',
  TRANSPORT: 'النقل',
  MICROBUS: 'الميكروباص',
};

// ============ ملخص كشف الحفلة الكامل — البنود اليدوية + إجمالي كل تصنيف متراكم ============
const getSummary = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  const [costItems, entries, supplierEntries] = await Promise.all([
    prisma.eventCostItem.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, include: { user: { select: { fullName: true } } } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId }, select: { category: true, total: true } }),
    prisma.eventSupplierEntry.findMany({ where: { eventId }, select: { total: true, paidAmount: true } }),
  ]);

  const categoryTotals = {};
  Object.keys(CATEGORY_LABELS).forEach((cat) => { categoryTotals[cat] = 0; });
  entries.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.total; });

  // الموردين — تصنيف مستقل بره enum التصنيفات المتراكمة، بس بيتحسب في
  // الإجمالي الكلي زيهم بالظبط. وبنحسب كمان المستحق (غير المدفوع) للحفلة دي
  const suppliersTotal = supplierEntries.reduce((s, e) => s + e.total, 0);
  const suppliersPaid = supplierEntries.reduce((s, e) => s + e.paidAmount, 0);
  const suppliersDue = suppliersTotal - suppliersPaid;

  const itemsTotal = costItems.reduce((s, i) => s + i.amount, 0);
  const categoriesTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const grandTotal = itemsTotal + categoriesTotal + suppliersTotal;

  res.json({
    success: true,
    data: {
      costItems,
      categoryTotals: Object.entries(categoryTotals).map(([key, total]) => ({ category: key, label: CATEGORY_LABELS[key], total })),
      itemsTotal,
      categoriesTotal,
      suppliersTotal,
      suppliersPaid,
      suppliersDue,
      grandTotal,
      expectedBudget: event.expectedBudget,
      budgetDiff: event.expectedBudget != null ? event.expectedBudget - grandTotal : null,
    },
  });
});

// ============ اقتراحات النقل — بتقرأ سيارات النقل المسجّلة فعلياً في أذون الصرف/المرتجع/نقل العهدة للحفلة دي ============
const getTransportSuggestions = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const [issueVouchers, returnVouchers, custodyOut, custodyIn, existingImports] = await Promise.all([
    prisma.issueVoucher.findMany({ where: { eventId, status: 'CONFIRMED', vehicles: { not: null } }, select: { id: true, number: true, createdAt: true, vehicles: true } }),
    prisma.returnVoucher.findMany({ where: { eventId, status: 'CONFIRMED', vehicles: { not: null } }, select: { id: true, number: true, createdAt: true, vehicles: true } }),
    prisma.custodyTransfer.findMany({ where: { fromEventId: eventId, status: 'CONFIRMED', vehicles: { not: null } }, select: { id: true, number: true, createdAt: true, vehicles: true } }),
    prisma.custodyTransfer.findMany({ where: { toEventId: eventId, status: 'CONFIRMED', vehicles: { not: null } }, select: { id: true, number: true, createdAt: true, vehicles: true } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId, category: 'TRANSPORT', sourceType: { not: null } }, select: { sourceType: true, sourceId: true, sourceVehicleIndex: true } }),
  ]);

  const importedSet = new Set(existingImports.map((e) => `${e.sourceType}|${e.sourceId}|${e.sourceVehicleIndex}`));

  const suggestions = [];
  function addSuggestions(vouchers, sourceType, sourceLabelPrefix) {
    vouchers.forEach((v) => {
      const list = Array.isArray(v.vehicles) ? v.vehicles : [];
      list.forEach((vehicleEntry, idx) => {
        const key = `${sourceType}|${v.id}|${idx}`;
        if (importedSet.has(key)) return; // اتضافت قبل كده، مش نقترحها تاني
        // توافق مع بيانات قديمة كانت مجرد نص بس (بدون عدد) — نعتبرها عدد 1
        const typeLabel = typeof vehicleEntry === 'string' ? vehicleEntry : vehicleEntry?.type;
        const count = typeof vehicleEntry === 'string' ? 1 : Number(vehicleEntry?.count) || 1;
        if (!typeLabel) return;
        suggestions.push({
          sourceType,
          sourceId: v.id,
          sourceVehicleIndex: idx,
          sourceLabel: `${sourceLabelPrefix} ${v.number}`,
          date: v.createdAt,
          typeLabel,
          count,
        });
      });
    });
  }
  addSuggestions(issueVouchers, 'ISSUE_VOUCHER', 'إذن صرف');
  addSuggestions(returnVouchers, 'RETURN_VOUCHER', 'إذن مرتجع');
  addSuggestions(custodyOut, 'CUSTODY_TRANSFER', 'نقل عهدة');
  addSuggestions(custodyIn, 'CUSTODY_TRANSFER', 'نقل عهدة');

  suggestions.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ success: true, data: suggestions });
});

// ============ بنود التوتال البسيطة ============
const createItem = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { label, amount, notes } = req.body;
  if (!label || amount == null || Number(amount) < 0) {
    throw new AppError('اسم البند والمبلغ مطلوبين، والمبلغ لازم يكون رقم غير سالب', 400);
  }
  const item = await prisma.eventCostItem.create({
    data: { eventId, label, amount: Number(amount), notes, userId: req.user.id },
  });
  await logActivity({ action: 'CREATE', entityType: 'EventCostItem', entityId: item.id, description: `إضافة بند تكلفة: ${label} (${amount})`, userId: req.user.id });
  res.status(201).json({ success: true, data: item });
});

const updateItem = asyncHandler(async (req, res) => {
  const { label, amount, notes } = req.body;
  const existing = await prisma.eventCostItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('البند غير موجود', 404);

  const updated = await prisma.eventCostItem.update({
    where: { id: existing.id },
    data: { ...(label && { label }), ...(amount != null && { amount: Number(amount) }), ...(notes !== undefined && { notes }) },
  });
  await logActivity({ action: 'UPDATE', entityType: 'EventCostItem', entityId: updated.id, description: `تعديل بند تكلفة: ${updated.label}`, userId: req.user.id });
  res.json({ success: true, data: updated });
});

const removeItem = asyncHandler(async (req, res) => {
  const existing = await prisma.eventCostItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('البند غير موجود', 404);
  await prisma.eventCostItem.delete({ where: { id: existing.id } });
  await logActivity({ action: 'DELETE', entityType: 'EventCostItem', entityId: existing.id, description: `حذف بند تكلفة: ${existing.label}`, userId: req.user.id });
  res.json({ success: true, message: 'تم حذف البند' });
});

// ============ الحركات اليومية لكل تصنيف متراكم ============
const listEntries = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { category, purposeId } = req.query;
  if (!category || !CATEGORY_LABELS[category]) throw new AppError('التصنيف غير صالح', 400);

  const entries = await prisma.eventCostRecordEntry.findMany({
    where: { eventId, category, ...(purposeId && { purposeId }) },
    include: { purpose: true, user: { select: { fullName: true } } },
    orderBy: { date: 'asc' },
  });
  const total = entries.reduce((s, e) => s + e.total, 0);
  res.json({ success: true, data: { entries, total } });
});

const createEntry = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { category, date, typeLabel, purposeId, count, unitPrice, notes, sourceType, sourceId, sourceVehicleIndex } = req.body;
  if (!category || !CATEGORY_LABELS[category]) throw new AppError('التصنيف غير صالح', 400);
  if (!date || !typeLabel || count == null || unitPrice == null) {
    throw new AppError('التاريخ والنوع والعدد والسعر كلها مطلوبة', 400);
  }
  const countNum = Number(count);
  const priceNum = Number(unitPrice);
  if (!Number.isFinite(countNum) || countNum <= 0 || !Number.isFinite(priceNum) || priceNum < 0) {
    throw new AppError('العدد لازم يكون أكبر من صفر، والسعر رقم غير سالب', 400);
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  // دمج تلقائي: لو فيه حركة موجودة بالفعل بنفس التصنيف والنوع واليوم والسعر
  // (زي "عربية كبيرة" بـ500 جنيه في نفس اليوم)، بنزوّد عددها بدل ما نكرر سطر
  // جديد منفصل — ده بيحصل تلقائي سواء الحركة داخلة يدوي أو مستوردة من إذن
  const existingMatch = await prisma.eventCostRecordEntry.findFirst({
    where: { eventId, category, typeLabel, unitPrice: priceNum, purposeId: purposeId || null, date: { gte: dayStart, lte: dayEnd } },
  });

  let entry;
  if (existingMatch) {
    const newCount = existingMatch.count + countNum;
    entry = await prisma.eventCostRecordEntry.update({
      where: { id: existingMatch.id },
      data: {
        count: newCount,
        total: newCount * priceNum,
        notes: notes || existingMatch.notes,
        // لو الحركة القديمة معندهاش مصدر (يدوية) والجديدة عندها، نسجّل المصدر
        // — مهم عشان تتبّع "اتستوردت قبل كده" يفضل شغال صح
        ...(!existingMatch.sourceType && sourceType && { sourceType, sourceId, sourceVehicleIndex }),
      },
      include: { purpose: true },
    });
    await logActivity({
      action: 'UPDATE',
      entityType: 'EventCostRecordEntry',
      entityId: entry.id,
      description: `دمج حركة ${CATEGORY_LABELS[category]}: ${typeLabel} — العدد بقى ${newCount} بدل ما يتكرر سطر جديد`,
      userId: req.user.id,
    });
    return res.status(201).json({ success: true, merged: true, data: entry });
  }

  entry = await prisma.eventCostRecordEntry.create({
    data: {
      eventId,
      category,
      date: new Date(date),
      typeLabel,
      purposeId: purposeId || null,
      count: countNum,
      unitPrice: priceNum,
      total: countNum * priceNum,
      notes,
      sourceType: sourceType || null,
      sourceId: sourceId || null,
      sourceVehicleIndex: sourceVehicleIndex ?? null,
      userId: req.user.id,
    },
    include: { purpose: true },
  });
  await logActivity({
    action: 'CREATE',
    entityType: 'EventCostRecordEntry',
    entityId: entry.id,
    description: `إضافة حركة ${CATEGORY_LABELS[category]}: ${typeLabel} ×${countNum} (${entry.total})`,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: entry });
});

const updateEntry = asyncHandler(async (req, res) => {
  const { date, typeLabel, purposeId, count, unitPrice, notes } = req.body;
  const existing = await prisma.eventCostRecordEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('الحركة غير موجودة', 404);

  const countNum = count != null ? Number(count) : existing.count;
  const priceNum = unitPrice != null ? Number(unitPrice) : existing.unitPrice;
  if (!Number.isFinite(countNum) || countNum <= 0 || !Number.isFinite(priceNum) || priceNum < 0) {
    throw new AppError('العدد لازم يكون أكبر من صفر، والسعر رقم غير سالب', 400);
  }

  const updated = await prisma.eventCostRecordEntry.update({
    where: { id: existing.id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(typeLabel && { typeLabel }),
      ...(purposeId !== undefined && { purposeId: purposeId || null }),
      count: countNum,
      unitPrice: priceNum,
      total: countNum * priceNum,
      ...(notes !== undefined && { notes }),
    },
    include: { purpose: true },
  });
  await logActivity({ action: 'UPDATE', entityType: 'EventCostRecordEntry', entityId: updated.id, description: `تعديل حركة ${CATEGORY_LABELS[updated.category]}: ${updated.typeLabel}`, userId: req.user.id });
  res.json({ success: true, data: updated });
});

const removeEntry = asyncHandler(async (req, res) => {
  const existing = await prisma.eventCostRecordEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('الحركة غير موجودة', 404);
  await prisma.eventCostRecordEntry.delete({ where: { id: existing.id } });
  await logActivity({ action: 'DELETE', entityType: 'EventCostRecordEntry', entityId: existing.id, description: `حذف حركة ${CATEGORY_LABELS[existing.category]}: ${existing.typeLabel}`, userId: req.user.id });
  res.json({ success: true, message: 'تم حذف الحركة' });
});

// ============ نسخ كشف كامل من حفلة سابقة كنقطة بداية ============
const copyFromEvent = asyncHandler(async (req, res) => {
  const { eventId, sourceEventId } = req.params;
  const target = await prisma.event.findUnique({ where: { id: eventId } });
  const source = await prisma.event.findUnique({ where: { id: sourceEventId } });
  if (!target || !source) throw new AppError('حفلة غير موجودة', 404);

  const [sourceItems, sourceEntries] = await Promise.all([
    prisma.eventCostItem.findMany({ where: { eventId: sourceEventId } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId: sourceEventId } }),
  ]);

  await prisma.$transaction(async (tx) => {
    if (sourceItems.length > 0) {
      await tx.eventCostItem.createMany({
        data: sourceItems.map((i) => ({ eventId, label: i.label, amount: i.amount, notes: i.notes, userId: req.user.id })),
      });
    }
    if (sourceEntries.length > 0) {
      await tx.eventCostRecordEntry.createMany({
        data: sourceEntries.map((e) => ({
          eventId,
          category: e.category,
          date: e.date,
          typeLabel: e.typeLabel,
          purposeId: e.purposeId,
          count: e.count,
          unitPrice: e.unitPrice,
          total: e.total,
          notes: e.notes,
          userId: req.user.id,
        })),
      });
    }
    await logActivity({
      action: 'CREATE',
      entityType: 'EventCostItem',
      entityId: eventId,
      description: `نسخ كشف حسابات كامل من حفلة "${source.name}" (${sourceItems.length} بند + ${sourceEntries.length} حركة)`,
      userId: req.user.id,
      tx,
    });
  });

  res.json({ success: true, message: `تم نسخ ${sourceItems.length} بند و ${sourceEntries.length} حركة من "${source.name}"` });
});

// ============ تقرير مقارنة عبر كل الحفلات ============
async function fetchComparisonData({ dateFrom, dateTo, q }) {
  const eventFilter = {
    ...(dateFrom && { startDate: { gte: new Date(dateFrom) } }),
    ...(dateTo && { startDate: { lte: new Date(dateTo) } }),
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { number: { contains: q, mode: 'insensitive' } }] }),
  };

  const events = await prisma.event.findMany({ where: eventFilter, select: { id: true, name: true, number: true, startDate: true } });
  const eventIds = events.map((e) => e.id);

  const [allItems, allEntries] = await Promise.all([
    prisma.eventCostItem.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, amount: true } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, category: true, total: true } }),
  ]);

  const perEvent = new Map(events.map((e) => [e.id, { ...e, itemsTotal: 0, categoryTotals: { DECOR_LABOR: 0, UNIFORMS: 0, TRANSPORT: 0, MICROBUS: 0 }, grandTotal: 0 }]));
  allItems.forEach((i) => {
    const row = perEvent.get(i.eventId);
    if (row) { row.itemsTotal += i.amount; row.grandTotal += i.amount; }
  });
  allEntries.forEach((e) => {
    const row = perEvent.get(e.eventId);
    if (row) { row.categoryTotals[e.category] += e.total; row.grandTotal += e.total; }
  });

  const rows = Array.from(perEvent.values()).filter((r) => r.grandTotal > 0).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const overallTotal = rows.reduce((s, r) => s + r.grandTotal, 0);
  const categorySums = { DECOR_LABOR: 0, UNIFORMS: 0, TRANSPORT: 0, MICROBUS: 0 };
  rows.forEach((r) => { Object.keys(categorySums).forEach((c) => { categorySums[c] += r.categoryTotals[c]; }); });

  return { rows, overallTotal, averagePerEvent: rows.length > 0 ? overallTotal / rows.length : 0, categorySums };
}

const getComparisonReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, q } = req.query;
  const { rows, overallTotal, averagePerEvent, categorySums } = await fetchComparisonData({ dateFrom, dateTo, q });

  res.json({
    success: true,
    data: {
      rows,
      overallTotal,
      averagePerEvent,
      categorySums: Object.entries(categorySums).map(([key, total]) => ({ category: key, label: CATEGORY_LABELS[key], total })),
      categoryLabels: CATEGORY_LABELS,
    },
  });
});

// GET /api/event-costs/comparison/export.xlsx
const exportComparisonExcel = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, q } = req.query;
  const { rows, overallTotal } = await fetchComparisonData({ dateFrom, dateTo, q });

  const excelRows = rows.map((r) => [
    r.number,
    r.name,
    new Date(r.startDate).toLocaleDateString('ar-EG'),
    r.itemsTotal,
    r.categoryTotals.DECOR_LABOR,
    r.categoryTotals.UNIFORMS,
    r.categoryTotals.TRANSPORT,
    r.categoryTotals.MICROBUS,
    r.grandTotal,
  ]);
  const highlightRows = [excelRows.length];
  excelRows.push(['', '', 'إجمالي كل الحفلات', '', '', '', '', '', overallTotal]);

  const buffer = await buildExcelReport(
    'تقرير مقارنة الحفلات',
    ['رقم الحفلة', 'اسم الحفلة', 'التاريخ', 'بنود التوتال', 'عمالة الديكور', 'البدلات', 'النقل', 'الميكروباص', 'الإجمالي'],
    excelRows,
    { highlightRows }
  );
  sendXlsx(res, 'تقرير-مقارنة-الحفلات', buffer);
});

// ============ تصدير Excel لكشف الحفلة كامل (البنود + كل حركات التصنيفات) ============
const exportExcel = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { client: true } });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  const [costItems, entries, supplierEntries] = await Promise.all([
    prisma.eventCostItem.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId }, include: { purpose: true }, orderBy: [{ category: 'asc' }, { date: 'asc' }] }),
    prisma.eventSupplierEntry.findMany({ where: { eventId }, include: { supplier: true }, orderBy: { date: 'asc' } }),
  ]);

  const rows = [];
  const highlightRows = [];

  // ============ التصنيفات المتراكمة الأربعة أولاً — كل حركاتها وبعدها إجماليها ============
  Object.keys(CATEGORY_LABELS).forEach((cat) => {
    const catEntries = entries.filter((e) => e.category === cat);
    if (catEntries.length === 0) return;
    catEntries.forEach((e) => {
      rows.push([CATEGORY_LABELS[cat], new Date(e.date).toLocaleDateString('ar-EG'), e.typeLabel, e.purpose?.name || '—', e.count, e.unitPrice, e.total]);
    });
    const catTotal = catEntries.reduce((s, e) => s + e.total, 0);
    highlightRows.push(rows.length);
    rows.push([`إجمالي ${CATEGORY_LABELS[cat]}`, '', '', '', '', '', catTotal]);
  });

  // ============ الموردين ============
  if (supplierEntries.length > 0) {
    supplierEntries.forEach((e) => {
      rows.push([
        'الموردين',
        new Date(e.date).toLocaleDateString('ar-EG'),
        `${e.supplier.name} — ${e.description}`,
        e.paidAmount >= e.total ? 'مدفوع' : `مستحق: ${e.total - e.paidAmount}`,
        e.count,
        e.unitPrice,
        e.total,
      ]);
    });
    const supTotal = supplierEntries.reduce((s, e) => s + e.total, 0);
    highlightRows.push(rows.length);
    rows.push(['إجمالي الموردين', '', '', '', '', '', supTotal]);
  }

  // ============ بنود التوتال بعد كده ============
  costItems.forEach((i) => {
    rows.push([i.label, '', '', '', '', '', i.amount]);
  });
  const itemsTotal = costItems.reduce((s, i) => s + i.amount, 0);
  highlightRows.push(rows.length);
  rows.push(['إجمالي بنود التوتال', '', '', '', '', '', itemsTotal]);

  const categoriesTotal = entries.reduce((s, e) => s + e.total, 0);
  const suppliersTotal = supplierEntries.reduce((s, e) => s + e.total, 0);
  const grandTotal = itemsTotal + categoriesTotal + suppliersTotal;
  highlightRows.push(rows.length);
  rows.push(['الإجمالي الكلي', '', '', '', '', '', grandTotal]);

  const meta = [event.client?.name, event.number, new Date(event.startDate).toLocaleDateString('ar-EG')].filter(Boolean).join(' — ');

  // لوجو الحفلة (لو موجود) — المسار في قاعدة البيانات نسبي (/uploads/xxx.jpg)،
  // فبنحوّله لمسار حقيقي على القرص عشان ExcelJS يقدر يقراه
  const eventLogoPath = event.logoUrl
    ? path.join(__dirname, '../..', event.logoUrl.replace(/^\//, ''))
    : undefined;

  const buffer = await buildExcelReport(
    `كشف حسابات - ${event.name} (${meta})`,
    ['البند/التصنيف', 'التاريخ', 'النوع', 'الغرض', 'العدد', 'السعر', 'الإجمالي'],
    rows,
    { highlightRows, eventLogoPath }
  );
  sendXlsx(res, `كشف-حسابات-${event.name}`, buffer);
});

// دالة مشتركة بيستخدمها كل من الـJSON العادي وتصدير الإكسيل — عشان الفلاتر
// (بحث، تاريخ من/لحد) تفضل متسقة في المكانين بالظبط
async function fetchEventsWithTotals({ q, dateFrom, dateTo, skip, take }) {
  const where = {
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { number: { contains: q, mode: 'insensitive' } }] }),
    ...(dateFrom && { startDate: { gte: new Date(dateFrom) } }),
    ...(dateTo && { startDate: { lte: new Date(dateTo) } }),
  };

  const [events, total, allMatchingEventIds] = await Promise.all([
    prisma.event.findMany({ where, include: { client: true }, orderBy: { startDate: 'desc' }, ...(skip != null && { skip, take }) }),
    prisma.event.count({ where }),
    prisma.event.findMany({ where, select: { id: true } }),
  ]);
  const eventIds = events.map((e) => e.id);
  const allIds = allMatchingEventIds.map((e) => e.id);

  const [allItems, allEntries, overallItems, overallEntries] = await Promise.all([
    prisma.eventCostItem.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, amount: true } }),
    prisma.eventCostRecordEntry.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, category: true, total: true, date: true } }),
    // إجمالي حقيقي عبر كل النتائج المطابقة للفلتر، مش بس الصفحة الحالية المعروضة
    prisma.eventCostItem.aggregate({ where: { eventId: { in: allIds } }, _sum: { amount: true } }),
    prisma.eventCostRecordEntry.aggregate({ where: { eventId: { in: allIds } }, _sum: { total: true } }),
  ]);

  const totalsByEvent = new Map();
  const laborDaysByEvent = new Map();
  allItems.forEach((i) => { totalsByEvent.set(i.eventId, (totalsByEvent.get(i.eventId) || 0) + i.amount); });
  allEntries.forEach((e) => {
    totalsByEvent.set(e.eventId, (totalsByEvent.get(e.eventId) || 0) + e.total);
    if (e.category === 'DECOR_LABOR') {
      if (!laborDaysByEvent.has(e.eventId)) laborDaysByEvent.set(e.eventId, new Set());
      laborDaysByEvent.get(e.eventId).add(new Date(e.date).toISOString().slice(0, 10));
    }
  });

  const data = events.map((ev) => ({ ...ev, costsTotal: totalsByEvent.get(ev.id) || 0, laborDaysCount: laborDaysByEvent.get(ev.id)?.size || 0 }));
  const overallTotal = (overallItems._sum.amount || 0) + (overallEntries._sum.total || 0);
  return { data, total, overallTotal };
}

// GET /api/event-costs/events-list — قايمة الحفلات بالإجمالي وعدد أيام العمالة، لصفحة الحسابات الرئيسية
const getEventsWithTotals = asyncHandler(async (req, res) => {
  const { q, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const { data, total, overallTotal } = await fetchEventsWithTotals({ q, dateFrom, dateTo, skip, take: Number(pageSize) });
  res.json({ success: true, data, meta: { page: Number(page), pageSize: Number(pageSize), total, totalPages: Math.ceil(total / Number(pageSize)), overallTotal } });
});

// GET /api/event-costs/events-list/export.xlsx — نفس القايمة، مصدّرة إكسيل كاملة (من غير تقسيم صفحات)
const exportEventsListExcel = asyncHandler(async (req, res) => {
  const { q, dateFrom, dateTo } = req.query;
  const { data, overallTotal } = await fetchEventsWithTotals({ q, dateFrom, dateTo });
  const rows = data.map((ev) => [ev.number, ev.name, ev.client?.name || '—', new Date(ev.startDate).toLocaleDateString('ar-EG'), ev.costsTotal, ev.laborDaysCount]);
  const highlightRows = [rows.length];
  rows.push(['', '', '', 'إجمالي كل الحفلات', overallTotal, '']);
  const buffer = await buildExcelReport('كشوفات تكاليف الحفلات', ['رقم الحفلة', 'اسم الحفلة', 'العميل', 'التاريخ', 'الإجمالي', 'عدد أيام العمالة'], rows, { highlightRows });
  sendXlsx(res, 'كشوفات-تكاليف-الحفلات', buffer);
});

// ============ تصدير Excel لتفاصيل تصنيف متراكم واحد لوحده (عمالة الديكور مثلاً) ============
const exportEntriesExcel = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { category, purposeId } = req.query;
  if (!category || !CATEGORY_LABELS[category]) throw new AppError('التصنيف غير صالح', 400);

  const [event, entries] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, include: { client: true } }),
    prisma.eventCostRecordEntry.findMany({
      where: { eventId, category, ...(purposeId && { purposeId }) },
      include: { purpose: true },
      orderBy: { date: 'asc' },
    }),
  ]);
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  const rows = entries.map((e) => [new Date(e.date).toLocaleDateString('ar-EG'), e.typeLabel, e.purpose?.name || '—', e.count, e.unitPrice, e.total]);
  const total = entries.reduce((s, e) => s + e.total, 0);
  const highlightRows = [rows.length];
  rows.push(['الإجمالي', '', '', '', '', total]);

  const buffer = await buildExcelReport(
    `${CATEGORY_LABELS[category]} - ${event.name}`,
    ['التاريخ', 'النوع', 'الغرض', 'العدد', 'السعر', 'الإجمالي'],
    rows,
    { highlightRows }
  );
  sendXlsx(res, `${CATEGORY_LABELS[category]}-${event.name}`, buffer);
});

module.exports = {
  CATEGORY_LABELS,
  getSummary,
  getEventsWithTotals,
  exportEventsListExcel,
  getTransportSuggestions,
  createItem,
  updateItem,
  removeItem,
  listEntries,
  createEntry,
  updateEntry,
  removeEntry,
  copyFromEvent,
  getComparisonReport,
  exportComparisonExcel,
  exportExcel,
  exportEntriesExcel,
};
