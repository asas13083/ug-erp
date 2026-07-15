const path = require('path');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');
const { buildExcelReport } = require('../services/excelExport');
const { increaseStock } = require('../services/stockService');
const { generateCode } = require('../utils/codeGenerator');

const ENTRY_INCLUDE = {
  supplier: { select: { id: true, name: true, phone: true, company: true } },
  lines: true,
  paymentAllocations: true,
};

/** المدفوع الكلي لفاتورة = المدفوع المباشر وقت إنشائها + كل التخصيصات من الدفعات */
function entryPaid(entry) {
  const allocated = (entry.paymentAllocations || []).reduce((s, a) => s + a.amount, 0);
  return entry.paidAmount + allocated;
}

/** بيحسب إجمالي الفاتورة من بنودها، وبيتحقق إن البنود سليمة */
function buildLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new AppError('لازم صنف واحد على الأقل في الفاتورة', 400);
  }
  const lines = rawLines.map((l) => {
    const itemName = (l.itemName || '').trim();
    const unit = (l.unit || 'قطعة').trim();
    const count = Number(l.count);
    const unitPrice = Number(l.unitPrice);
    if (!itemName) throw new AppError('اسم الصنف مطلوب في كل بند', 400);
    if (!Number.isFinite(count) || count <= 0) throw new AppError(`العدد لازم يكون أكبر من صفر (${itemName})`, 400);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new AppError(`السعر لازم يكون رقم غير سالب (${itemName})`, 400);
    return { itemName, unit, count, unitPrice, total: count * unitPrice };
  });
  const total = lines.reduce((s, l) => s + l.total, 0);
  return { lines, total };
}

// ============ فواتير الموردين على الحفلات ============

const listEventEntries = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const rawEntries = await prisma.eventSupplierEntry.findMany({
    where: { eventId },
    include: ENTRY_INCLUDE,
    orderBy: { date: 'asc' },
  });
  // بنرفق لكل فاتورة المدفوع الكلي (المباشر + التخصيصات) والمتبقّي عليها
  const entries = rawEntries.map((e) => {
    const paid = entryPaid(e);
    return { ...e, paidTotal: paid, due: e.total - paid };
  });
  const total = entries.reduce((s, e) => s + e.total, 0);
  const paid = entries.reduce((s, e) => s + e.paidTotal, 0);
  res.json({ success: true, data: { entries, total, paid, due: total - paid } });
});

const createEventEntry = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { supplierId, date, description, paidAmount, imageUrl, notes, lines: rawLines } = req.body;

  if (!supplierId || !date || !description) throw new AppError('المورد والتاريخ والوصف مطلوبين', 400);

  const { lines, total } = buildLines(rawLines);
  const paidNum = Number(paidAmount) || 0;
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
      total,
      paidAmount: paidNum,
      imageUrl: imageUrl || null,
      notes,
      userId: req.user.id,
      lines: { create: lines },
    },
    include: ENTRY_INCLUDE,
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

const updateEventEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { supplierId, date, description, paidAmount, imageUrl, notes, lines: rawLines } = req.body;

  const existing = await prisma.eventSupplierEntry.findUnique({ where: { id }, include: { lines: true } });
  if (!existing) throw new AppError('الفاتورة غير موجودة', 404);

  // لو أي بند اتضاف للمخزن بالفعل، مينفعش نعدّل البنود (عشان منبوّظش المخزون)
  const hasAddedLines = existing.lines.some((l) => l.addedToWarehouseId);
  if (rawLines && hasAddedLines) {
    throw new AppError('مينفعش تعدّل بنود الفاتورة — فيه أصناف اتضافت للمخزن بالفعل. لازم تشيلها من المخزن الأول.', 409);
  }

  let total = existing.total;
  let lineData;
  if (rawLines) {
    const built = buildLines(rawLines);
    total = built.total;
    lineData = built.lines;
  }

  const paidNum = paidAmount != null ? Number(paidAmount) : existing.paidAmount;
  if (paidNum < 0 || paidNum > total) throw new AppError('المدفوع لازم يكون بين صفر وإجمالي الفاتورة', 400);

  const entry = await prisma.$transaction(async (tx) => {
    if (lineData) {
      await tx.eventSupplierEntryLine.deleteMany({ where: { entryId: id } });
    }
    return tx.eventSupplierEntry.update({
      where: { id },
      data: {
        ...(supplierId && { supplierId }),
        ...(date && { date: new Date(date) }),
        ...(description && { description }),
        ...(lineData && { total, lines: { create: lineData } }),
        paidAmount: paidNum,
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(notes !== undefined && { notes }),
      },
      include: ENTRY_INCLUDE,
    });
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

const deleteEventEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await prisma.eventSupplierEntry.findUnique({ where: { id }, include: { supplier: true, lines: true } });
  if (!entry) throw new AppError('الفاتورة غير موجودة', 404);

  if (entry.lines.some((l) => l.addedToWarehouseId)) {
    throw new AppError('مينفعش تحذف الفاتورة — فيه أصناف منها اتضافت للمخزن بالفعل', 409);
  }

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

// ============ واردات المخزن (بدون أي فلوس) ============

/**
 * GET /api/supplier-deliveries — كل الأصناف الجاية من الموردين، من غير أي
 * بيانات مالية خالص (لا سعر ولا إجمالي ولا مدفوع). ده اللي أمين المخزن بيشوفه:
 * إيه اللي جه، من مين، لأي حفلة، واتضاف للمخزن ولا لسه.
 */
const listDeliveries = asyncHandler(async (req, res) => {
  const { status } = req.query; // pending | added | (كله لو مش متحدد)

  const lines = await prisma.eventSupplierEntryLine.findMany({
    where:
      status === 'pending'
        ? { addedToWarehouseId: null, dismissedFromWarehouse: false }
        : status === 'added'
          ? { addedToWarehouseId: { not: null } }
          : {},
    include: {
      entry: {
        select: {
          id: true,
          date: true,
          description: true,
          imageUrl: true,
          supplier: { select: { id: true, name: true, phone: true } },
          event: { select: { id: true, name: true, number: true } },
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  // بنرجّع الحقول اللي أمين المخزن محتاجها بس — بدون أي سعر أو إجمالي
  const data = lines.map((l) => ({
    id: l.id,
    itemName: l.itemName,
    unit: l.unit,
    count: l.count,
    addedToWarehouseId: l.addedToWarehouseId,
    addedAt: l.addedAt,
    createdItemId: l.createdItemId,
    dismissedFromWarehouse: l.dismissedFromWarehouse,
    supplier: l.entry.supplier,
    event: l.entry.event,
    invoiceDate: l.entry.date,
    invoiceDescription: l.entry.description,
    invoiceImageUrl: l.entry.imageUrl,
  }));

  res.json({ success: true, data });
});

/**
 * PATCH /api/supplier-deliveries/:lineId/dismiss
 * أمين المخزن بيستبعد البند من قايمته (بند إيجار مثلاً مش هيتخزّن). البند
 * بيفضل مسجّل كتكلفة على المورد، بس بيختفي من قايمة "زوّد المخزن". قابل
 * للتراجع. مينفعش نستبعد بند اتضاف للمخزن فعلاً.
 */
const dismissDelivery = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const { dismissed = true } = req.body;

  const line = await prisma.eventSupplierEntryLine.findUnique({
    where: { id: lineId },
    include: { entry: { include: { supplier: true, event: true } } },
  });
  if (!line) throw new AppError('البند غير موجود', 404);
  if (line.addedToWarehouseId) throw new AppError('البند ده اتضاف للمخزن بالفعل، مينفعش تستبعده', 409);

  const updated = await prisma.eventSupplierEntryLine.update({
    where: { id: lineId },
    data: { dismissedFromWarehouse: !!dismissed },
  });

  await logActivity({
    action: 'UPDATE',
    entityType: 'EventSupplierEntryLine',
    entityId: lineId,
    description: `${dismissed ? 'استبعاد' : 'إرجاع'} وارد مورد ${dismissed ? 'من' : 'إلى'} قايمة المخزن: ${line.itemName} — ${line.entry.supplier.name}`,
    userId: req.user.id,
  });

  res.json({ success: true, data: updated });
});

/**
 * POST /api/supplier-deliveries/:lineId/add-to-warehouse
 * أمين المخزن بيضيف الصنف الجاي من المورد للمخزن. بيقدر يربطه بصنف موجود
 * (itemId) أو يعمل صنف جديد (categoryId + itemName). العملية مرة واحدة بس —
 * لو اتضاف قبل كده، بنرفض عشان منزوّدش الكمية مرتين بالغلط.
 */
const addDeliveryToWarehouse = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const { warehouseId, itemId, categoryId, unit } = req.body;

  if (!warehouseId) throw new AppError('المخزن مطلوب', 400);

  const line = await prisma.eventSupplierEntryLine.findUnique({
    where: { id: lineId },
    include: { entry: { include: { supplier: true, event: true } } },
  });
  if (!line) throw new AppError('البند غير موجود', 404);
  if (line.addedToWarehouseId) throw new AppError('البند ده اتضاف للمخزن بالفعل', 409);

  const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
  if (!warehouse) throw new AppError('المخزن غير موجود', 404);

  const result = await prisma.$transaction(async (tx) => {
    let finalItemId = itemId;

    if (!finalItemId) {
      // صنف جديد — محتاجين تصنيف
      if (!categoryId) throw new AppError('لازم تختار صنف موجود، أو تصنيف عشان نعمل صنف جديد', 400);

      // لو فيه صنف بنفس الاسم والتصنيف، بندمج فيه بدل ما نكرر (نفس منطق النظام)
      const existingItem = await tx.item.findFirst({
        where: { name: line.itemName, categoryId, isActive: true },
      });

      if (existingItem) {
        finalItemId = existingItem.id;
      } else {
        const code = await generateCode('item');
        const created = await tx.item.create({
          data: {
            code,
            name: line.itemName,
            categoryId,
            unit: unit || line.unit || 'قطعة',
            isActive: true,
          },
        });
        finalItemId = created.id;
      }
    }

    await increaseStock({ itemId: finalItemId, warehouseId, quantity: line.count, tx });

    return tx.eventSupplierEntryLine.update({
      where: { id: lineId },
      data: {
        addedToWarehouseId: warehouseId,
        addedAt: new Date(),
        addedByUserId: req.user.id,
        createdItemId: finalItemId,
      },
    });
  });

  await logActivity({
    action: 'CREATE',
    entityType: 'Item',
    entityId: result.createdItemId,
    description: `إضافة وارد مورد للمخزن: ${line.itemName} (${line.count} ${line.unit}) من ${line.entry.supplier.name} — حفلة ${line.entry.event.name}`,
    userId: req.user.id,
  });

  res.json({ success: true, message: 'تمت الإضافة للمخزن', data: result });
});

// ============ ملف المورد ============

const getSupplierProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const [entries, payments] = await Promise.all([
    prisma.eventSupplierEntry.findMany({
      where: { supplierId: id },
      include: { event: { select: { id: true, name: true, number: true, startDate: true } }, lines: true, paymentAllocations: true },
      orderBy: { date: 'desc' },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: id },
      include: { user: { select: { fullName: true } }, allocations: { include: { entry: { select: { id: true, description: true, event: { select: { id: true, name: true, number: true } } } } } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  // المدفوع الكلي لكل فاتورة = مباشر + تخصيصات. المتبقّي = الإجمالي − ده.
  const entriesEnriched = entries.map((e) => {
    const paid = entryPaid(e);
    return { ...e, paidTotal: paid, remaining: e.total - paid };
  });

  const totalInvoiced = entriesEnriched.reduce((s, e) => s + e.total, 0);
  const totalPaid = entriesEnriched.reduce((s, e) => s + e.paidTotal, 0);

  const byEvent = new Map();
  entriesEnriched.forEach((e) => {
    if (!byEvent.has(e.eventId)) byEvent.set(e.eventId, { event: e.event, total: 0, paid: 0, count: 0 });
    const row = byEvent.get(e.eventId);
    row.total += e.total;
    row.paid += e.paidTotal;
    row.count += 1;
  });

  // الفواتير اللي لسه عليها متبقّي — دي اللي بتظهر في شاشة توزيع الدفعة
  const openInvoices = entriesEnriched
    .filter((e) => e.remaining > 0.001)
    .map((e) => ({ id: e.id, description: e.description, date: e.date, total: e.total, remaining: e.remaining, event: e.event }));

  res.json({
    success: true,
    data: {
      supplier,
      entries: entriesEnriched,
      payments,
      events: Array.from(byEvent.values()),
      openInvoices,
      totalInvoiced,
      totalPaid,
      due: totalInvoiced - totalPaid,
    },
  });
});

const listWithBalances = asyncHandler(async (req, res) => {
  const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });

  const [allEntries, allPayments] = await Promise.all([
    prisma.eventSupplierEntry.groupBy({ by: ['supplierId'], _sum: { total: true, paidAmount: true } }),
    prisma.supplierPayment.groupBy({ by: ['supplierId'], _sum: { amount: true } }),
  ]);

  const entryMap = new Map(allEntries.map((e) => [e.supplierId, e._sum]));
  const paymentMap = new Map(allPayments.map((p) => [p.supplierId, p._sum.amount || 0]));

  const data = suppliers.map((s) => {
    const sums = entryMap.get(s.id) || { total: 0, paidAmount: 0 };
    const totalInvoiced = sums.total || 0;
    const totalPaid = (sums.paidAmount || 0) + (paymentMap.get(s.id) || 0);
    return { ...s, totalInvoiced, totalPaid, due: totalInvoiced - totalPaid };
  });

  res.json({ success: true, data });
});

// ============ دفعات الموردين ============

const createPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, date, notes, allocations } = req.body;

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) throw new AppError('مبلغ الدفعة لازم يكون أكبر من صفر', 400);
  if (!date) throw new AppError('تاريخ الدفعة مطلوب', 400);

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  // التخصيصات اختيارية: توزيع جزء (أو كل) الدفعة على فواتير معيّنة للمورد ده.
  // بنتحقق إن كل فاتورة بتاعت المورد ده فعلاً، وإن المخصّص ليها ما يزيدش عن
  // المتبقّي عليها، وإن مجموع التخصيصات ما يزيدش عن مبلغ الدفعة نفسه.
  let cleanAllocations = [];
  if (Array.isArray(allocations) && allocations.length > 0) {
    const entryIds = allocations.map((a) => a.entryId);
    const entries = await prisma.eventSupplierEntry.findMany({
      where: { id: { in: entryIds }, supplierId: id },
      include: { paymentAllocations: true },
    });
    const entryMap = new Map(entries.map((e) => [e.id, e]));

    let allocatedSum = 0;
    for (const a of allocations) {
      const amt = Number(a.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue; // نتجاهل السطور الفاضية
      const entry = entryMap.get(a.entryId);
      if (!entry) throw new AppError('فاتورة غير موجودة أو مش تابعة للمورد ده', 400);
      const remaining = entry.total - entryPaid(entry);
      if (amt > remaining + 0.001) {
        throw new AppError(`المبلغ المخصّص لفاتورة "${entry.description}" أكبر من المتبقّي عليها (${Math.round(remaining)})`, 400);
      }
      allocatedSum += amt;
      cleanAllocations.push({ entryId: a.entryId, amount: amt });
    }
    if (allocatedSum > amountNum + 0.001) {
      throw new AppError('مجموع المبالغ الموزّعة على الفواتير أكبر من قيمة الدفعة', 400);
    }
  }

  const payment = await prisma.supplierPayment.create({
    data: {
      supplierId: id,
      amount: amountNum,
      date: new Date(date),
      notes,
      userId: req.user.id,
      allocations: cleanAllocations.length ? { create: cleanAllocations } : undefined,
    },
    include: { user: { select: { fullName: true } }, allocations: true },
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

const exportSupplierExcel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const [entries, payments] = await Promise.all([
    prisma.eventSupplierEntry.findMany({
      where: { supplierId: id },
      include: { event: { select: { name: true } }, lines: true, paymentAllocations: true },
      orderBy: { date: 'desc' },
    }),
    prisma.supplierPayment.findMany({ where: { supplierId: id }, orderBy: { date: 'desc' } }),
  ]);

  const rows = [];
  const highlightRows = [];

  entries.forEach((e) => {
    e.lines.forEach((l) => {
      rows.push([
        new Date(e.date).toLocaleDateString('ar-EG'),
        e.event?.name || '—',
        e.description,
        l.itemName,
        `${l.count} ${l.unit}`,
        l.unitPrice,
        l.total,
      ]);
    });
    highlightRows.push(rows.length);
    const paid = e.paidAmount + (e.paymentAllocations || []).reduce((s, a) => s + a.amount, 0);
    rows.push(['', '', `إجمالي: ${e.description}`, '', '', `مدفوع: ${Math.round(paid)}`, e.total]);
  });

  payments.forEach((p) => {
    rows.push([new Date(p.date).toLocaleDateString('ar-EG'), '—', 'دفعة', p.notes || '—', '—', '—', -p.amount]);
  });

  const totalInvoiced = entries.reduce((s, e) => s + e.total, 0);
  const totalPaid = entries.reduce((s, e) => s + e.paidAmount, 0) + payments.reduce((s, p) => s + p.amount, 0);

  highlightRows.push(rows.length);
  rows.push(['الإجمالي', '', '', '', `مدفوع: ${totalPaid}`, `متبقي: ${totalInvoiced - totalPaid}`, totalInvoiced]);

  const buffer = await buildExcelReport(
    `كشف حساب مورد — ${supplier.name}`,
    ['التاريخ', 'الحفلة', 'الفاتورة', 'الصنف', 'الكمية', 'السعر', 'الإجمالي'],
    rows,
    { highlightRows }
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="supplier-${supplier.id}.xlsx"`);
  res.send(buffer);
});

const exportEventSuppliersExcel = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { client: true } });
  if (!event) throw new AppError('الحفلة غير موجودة', 404);

  const entries = await prisma.eventSupplierEntry.findMany({
    where: { eventId },
    include: { supplier: { select: { name: true } }, lines: true },
    orderBy: { date: 'asc' },
  });

  const rows = [];
  const highlightRows = [];

  entries.forEach((e) => {
    e.lines.forEach((l) => {
      rows.push([
        e.supplier.name,
        new Date(e.date).toLocaleDateString('ar-EG'),
        e.description,
        l.itemName,
        `${l.count} ${l.unit}`,
        l.unitPrice,
        l.total,
      ]);
    });
    highlightRows.push(rows.length);
    rows.push(['', '', `إجمالي الفاتورة`, '', `مدفوع: ${e.paidAmount}`, `متبقي: ${e.total - e.paidAmount}`, e.total]);
  });

  const total = entries.reduce((s, e) => s + e.total, 0);
  const paid = entries.reduce((s, e) => s + e.paidAmount, 0);

  highlightRows.push(rows.length);
  rows.push(['الإجمالي الكلي', '', '', '', `مدفوع: ${paid}`, `متبقي: ${total - paid}`, total]);

  const eventLogoPath = event.logoUrl ? path.join(__dirname, '../..', event.logoUrl.replace(/^\//, '')) : undefined;

  const buffer = await buildExcelReport(
    `موردين حفلة — ${event.name} (${event.number})`,
    ['المورد', 'التاريخ', 'الفاتورة', 'الصنف', 'الكمية', 'السعر', 'الإجمالي'],
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
  listDeliveries,
  addDeliveryToWarehouse,
  dismissDelivery,
  getSupplierProfile,
  listWithBalances,
  createPayment,
  deletePayment,
  exportSupplierExcel,
  exportEventSuppliersExcel,
};
