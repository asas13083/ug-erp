const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { generateCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');

// يجمع كمية الصنف من كل المخازن في رقم واحد للعرض في الجداول
function withTotalQuantity(item) {
  const totalQuantity = item.stockLevels?.reduce((sum, s) => sum + s.quantity, 0) || 0;
  const totalReserved = item.stockLevels?.reduce((sum, s) => sum + s.reservedQty, 0) || 0;
  // الحد الأدنى بقى خاص بكل مخزن على حدة — الصنف يبقى "تنبيه" لو أي مخزن من
  // مخازنه وصل لحده الأدنى أو أقل، مش لو الإجمالي الكلي وصل لرقم واحد ثابت
  const hasLowStockWarehouse = item.stockLevels?.some((s) => s.minQuantity > 0 && s.quantity <= s.minQuantity) || false;
  return { ...item, totalQuantity, totalReserved, availableQuantity: totalQuantity - totalReserved, hasLowStockWarehouse };
}

// GET /api/items?q=&categoryId=&lowStockOnly=true
// GET /api/items?q=&categoryId=&lowStockOnly=true&page=&pageSize=
/**
 * يحسب لمجموعة أصناف دفعة واحدة (بدل كل صنف لوحده): "لسه برا" على مستوى
 * النظام كله + كام حفلة الصنف موزّع عليها دلوقتي. بيُستخدم في قائمة
 * الأصناف عشان الأرقام دي تظهر في الجدول مباشرة من غير ما تفتح تفاصيل الصنف.
 */
async function computeItemAggregates(itemIds) {
  if (itemIds.length === 0) return new Map();

  const [issueLines, returnLines, lossLines, custodyLines] = await Promise.all([
    prisma.issueVoucherItem.findMany({
      where: { itemId: { in: itemIds }, voucher: { status: 'CONFIRMED' } },
      select: { itemId: true, quantity: true, voucher: { select: { eventId: true, warehouse: { select: { name: true } } } } },
    }),
    prisma.returnVoucherItem.findMany({
      where: { itemId: { in: itemIds }, voucher: { status: 'CONFIRMED' } },
      select: { itemId: true, returnedQuantity: true, damagedQuantity: true, voucher: { select: { eventId: true } } },
    }),
    prisma.lossRecord.findMany({
      where: { itemId: { in: itemIds }, status: 'CONFIRMED' },
      select: { itemId: true, quantity: true, eventId: true },
    }),
    // عهدة خرجت من حفلة لحفلة تانية = بتتحسب "اتحسبت" على الحفلة المصدر (زي المرتجع تماماً)
    prisma.custodyTransferItem.findMany({
      where: { itemId: { in: itemIds }, transfer: { status: 'CONFIRMED' } },
      select: { itemId: true, quantity: true, transfer: { select: { fromEventId: true, toEventId: true, fromEvent: { select: { name: true } } } } },
    }),
  ]);

  const issuedTotal = new Map(); // itemId -> total issued
  const accountedTotal = new Map(); // itemId -> total returned+damaged+lost+transferredOut
  const lostTotal = new Map(); // itemId -> إجمالي الفاقد بس (بدون مرتجع أو نقل عهدة)
  const issuedByItemEvent = new Map(); // "itemId|eventId" -> issued
  const accountedByItemEvent = new Map(); // "itemId|eventId" -> accounted
  const sourceByItemEvent = new Map(); // "itemId|eventId" -> [{ type, name, quantity }]

  function addSource(key, type, name, quantity) {
    if (quantity <= 0) return;
    if (!sourceByItemEvent.has(key)) sourceByItemEvent.set(key, []);
    const arr = sourceByItemEvent.get(key);
    const existing = arr.find((s) => s.type === type && s.name === name);
    if (existing) existing.quantity += quantity;
    else arr.push({ type, name, quantity });
  }

  issueLines.forEach((l) => {
    issuedTotal.set(l.itemId, (issuedTotal.get(l.itemId) || 0) + l.quantity);
    const key = `${l.itemId}|${l.voucher.eventId}`;
    issuedByItemEvent.set(key, (issuedByItemEvent.get(key) || 0) + l.quantity);
    addSource(key, 'warehouse', l.voucher.warehouse?.name || '—', l.quantity);
  });
  returnLines.forEach((l) => {
    const amount = l.returnedQuantity + l.damagedQuantity;
    accountedTotal.set(l.itemId, (accountedTotal.get(l.itemId) || 0) + amount);
    const key = `${l.itemId}|${l.voucher.eventId}`;
    accountedByItemEvent.set(key, (accountedByItemEvent.get(key) || 0) + amount);
  });
  lossLines.forEach((l) => {
    accountedTotal.set(l.itemId, (accountedTotal.get(l.itemId) || 0) + l.quantity);
    lostTotal.set(l.itemId, (lostTotal.get(l.itemId) || 0) + l.quantity);
    if (l.eventId) {
      const key = `${l.itemId}|${l.eventId}`;
      accountedByItemEvent.set(key, (accountedByItemEvent.get(key) || 0) + l.quantity);
    }
  });
  // نفس منطق نقل العهدة في صفحة الحفلة بالظبط: خارجة = اتحسبت على المصدر،
  // داخلة = بتتحسب "خرجت" على الحفلة الهدف (زي إذن صرف جديد)
  custodyLines.forEach((l) => {
    accountedTotal.set(l.itemId, (accountedTotal.get(l.itemId) || 0) + l.quantity);
    const fromKey = `${l.itemId}|${l.transfer.fromEventId}`;
    accountedByItemEvent.set(fromKey, (accountedByItemEvent.get(fromKey) || 0) + l.quantity);

    issuedTotal.set(l.itemId, (issuedTotal.get(l.itemId) || 0) + l.quantity);
    const toKey = `${l.itemId}|${l.transfer.toEventId}`;
    issuedByItemEvent.set(toKey, (issuedByItemEvent.get(toKey) || 0) + l.quantity);
    addSource(toKey, 'custody', l.transfer.fromEvent?.name || '—', l.quantity);
  });

  const eventsCountByItem = new Map();
  const pendingEventsByItem = new Map(); // itemId -> [eventId]
  const stillOutSourcesByItem = new Map(); // itemId -> [{ type, name, quantity }]
  issuedByItemEvent.forEach((issued, key) => {
    const [itemId] = key.split('|');
    const eventId = key.split('|')[1];
    const accounted = accountedByItemEvent.get(key) || 0;
    const pending = issued - accounted;
    if (pending > 0) {
      eventsCountByItem.set(itemId, (eventsCountByItem.get(itemId) || 0) + 1);
      if (!pendingEventsByItem.has(itemId)) pendingEventsByItem.set(itemId, []);
      pendingEventsByItem.get(itemId).push(eventId);

      // نوزّع الكمية المعلّقة دي على مصادرها بنفس النسبة (لو الصنف طلع من
      // أكتر من مخزن لنفس الحفلة، كل مخزن ياخد نصيبه بالتناسب)
      const sources = sourceByItemEvent.get(key) || [];
      const totalSourceQty = sources.reduce((s, x) => s + x.quantity, 0) || 1;
      if (!stillOutSourcesByItem.has(itemId)) stillOutSourcesByItem.set(itemId, []);
      const itemSources = stillOutSourcesByItem.get(itemId);
      sources.forEach((src) => {
        const share = Math.round((src.quantity / totalSourceQty) * pending);
        if (share <= 0) return;
        const existing = itemSources.find((s) => s.type === src.type && s.name === src.name);
        if (existing) existing.quantity += share;
        else itemSources.push({ type: src.type, name: src.name, quantity: share });
      });
    }
  });

  // نجيب أسماء كل الحفلات المعلّقة دي مرة واحدة (بدل ما كل صنف يطلب اسمها لوحده)
  const allPendingEventIds = [...new Set(Array.from(pendingEventsByItem.values()).flat())];
  const eventsInfo = allPendingEventIds.length
    ? await prisma.event.findMany({ where: { id: { in: allPendingEventIds } }, select: { id: true, name: true } })
    : [];
  const eventNameMap = new Map(eventsInfo.map((e) => [e.id, e.name]));

  const result = new Map();
  itemIds.forEach((id) => {
    const issued = issuedTotal.get(id) || 0;
    const accounted = accountedTotal.get(id) || 0;
    const pendingIds = pendingEventsByItem.get(id) || [];
    result.set(id, {
      stillOut: Math.max(issued - accounted, 0),
      eventsCount: eventsCountByItem.get(id) || 0,
      pendingEvents: pendingIds.map((eventId) => ({ id: eventId, name: eventNameMap.get(eventId) || '—' })),
      stillOutSources: stillOutSourcesByItem.get(id) || [],
      lost: lostTotal.get(id) || 0,
    });
  });
  return result;
}

function attachAggregates(items, aggMap) {
  return items.map((i) => ({ ...i, ...(aggMap.get(i.id) || { stillOut: 0, eventsCount: 0, pendingEvents: [], stillOutSources: [], lost: 0 }) }));
}

const list = asyncHandler(async (req, res) => {
  const { q, categoryId, lowStockOnly } = req.query;
  const { page, pageSize, skip, take } = getPagination(req, 20);

  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(q && {
      OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }],
    }),
  };

  // فلتر "نقص المخزون" بيحتاج يشتغل على كل البيانات مش صفحة واحدة بس، فبنجيبها كاملة في الحالة دي
  if (lowStockOnly === 'true') {
    const items = await prisma.item.findMany({ where, include: { category: true, stockLevels: { where: { warehouse: { deletedAt: null } }, include: { warehouse: true } } }, orderBy: { createdAt: 'desc' } });
    const filtered = items.map(withTotalQuantity).filter((i) => i.hasLowStockWarehouse);
    const aggMap = await computeItemAggregates(filtered.map((i) => i.id));
    return res.json({ success: true, data: attachAggregates(filtered, aggMap), meta: buildMeta(1, filtered.length || 1, filtered.length) });
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({ where, include: { category: true, stockLevels: { where: { warehouse: { deletedAt: null } }, include: { warehouse: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.item.count({ where }),
  ]);

  const withQty = items.map(withTotalQuantity);
  const aggMap = await computeItemAggregates(withQty.map((i) => i.id));
  res.json({ success: true, data: attachAggregates(withQty, aggMap), meta: buildMeta(page, pageSize, total) });
});

// GET /api/items/:id
const getOne = asyncHandler(async (req, res) => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: { category: true, stockLevels: { where: { warehouse: { deletedAt: null } }, include: { warehouse: true } } },
  });
  if (!item) throw new AppError('الصنف غير موجود', 404);
  res.json({ success: true, data: withTotalQuantity(item) });
});

// POST /api/items — إضافة صنف جديد (مع كمية ابتدائية اختيارية في مخزن معين)
const create = asyncHandler(async (req, res) => {
  const { name, categoryId, unit, minQuantity, defaultLocation, imageUrl, barcode, notes, initialWarehouseId, initialQuantity } = req.body;

  if (!name || !categoryId || !unit) {
    throw new AppError('اسم الصنف والتصنيف والوحدة حقول مطلوبة', 400);
  }

  // لو أصلاً فيه صنف نشط بنفس الاسم ونفس التصنيف، نعتبره نفس الصنف —
  // ندمج الكمية الجديدة في رصيده بدل ما نعمل صف مكرر بنفس الاسم
  const existingItem = await prisma.item.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' }, categoryId, isActive: true },
  });

  if (existingItem) {
    if (initialWarehouseId && initialQuantity > 0) {
      await prisma.$transaction(async (tx) => {
        const existingLevel = await tx.stockLevel.findUnique({
          where: { itemId_warehouseId: { itemId: existingItem.id, warehouseId: initialWarehouseId } },
        });
        await tx.stockLevel.upsert({
          where: { itemId_warehouseId: { itemId: existingItem.id, warehouseId: initialWarehouseId } },
          update: {
            quantity: { increment: Number(initialQuantity) },
            // مبنغيّرش الحد الأدنى لو أصلاً متحدد، إلا لو مكانش متحدد قبل كده
            ...(!existingLevel?.minQuantity && minQuantity > 0 && { minQuantity: Number(minQuantity) }),
          },
          create: { itemId: existingItem.id, warehouseId: initialWarehouseId, quantity: Number(initialQuantity), minQuantity: Number(minQuantity) || 0 },
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'Item',
          entityId: existingItem.id,
          description: `دمج كمية جديدة (${initialQuantity}) في صنف موجود: ${existingItem.name} — بدل إنشاء صنف مكرر`,
          userId: req.user.id,
          tx,
        });
      });
    }
    return res.status(200).json({ success: true, merged: true, message: `فيه صنف بنفس الاسم والتصنيف أصلاً (${existingItem.name}) — تم دمج الكمية فيه بدل إنشاء صنف مكرر`, data: existingItem });
  }

  const item = await prisma.$transaction(async (tx) => {
    const code = await generateCode('item');
    const created = await tx.item.create({
      data: { code, name, categoryId, unit, minQuantity: minQuantity || 0, defaultLocation, imageUrl, barcode, notes },
    });

    if (initialWarehouseId && initialQuantity > 0) {
      await tx.stockLevel.create({
        data: { itemId: created.id, warehouseId: initialWarehouseId, quantity: initialQuantity, minQuantity: Number(minQuantity) || 0 },
      });
    }

    await logActivity({
      action: 'CREATE',
      entityType: 'Item',
      entityId: created.id,
      description: `إضافة صنف جديد: ${created.name} (${created.code})`,
      userId: req.user.id,
      tx,
    });

    return created;
  });

  res.status(201).json({ success: true, data: item });
});

// PUT /api/items/:id
const update = asyncHandler(async (req, res) => {
  const { name, categoryId, unit, minQuantity, defaultLocation, imageUrl, barcode, notes } = req.body;

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.item.update({
      where: { id: req.params.id },
      data: { name, categoryId, unit, minQuantity, defaultLocation, imageUrl, barcode, notes },
    });
    await logActivity({
      action: 'UPDATE',
      entityType: 'Item',
      entityId: updated.id,
      description: `تعديل بيانات صنف: ${updated.name}`,
      userId: req.user.id,
      tx,
    });
    return updated;
  });

  res.json({ success: true, data: item });
});

// DELETE /api/items/:id — حذف منطقي (Soft Delete) للحفاظ على السجل التاريخي
const remove = asyncHandler(async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const item = await tx.item.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logActivity({
      action: 'DELETE',
      entityType: 'Item',
      entityId: item.id,
      description: `حذف (إلغاء تفعيل) صنف: ${item.name}`,
      userId: req.user.id,
      tx,
    });
  });
  res.json({ success: true, message: 'تم حذف الصنف بنجاح' });
});

module.exports = { list, getOne, create, update, remove };

// GET /api/items/trash/list — عرض كل الأصناف المحذوفة (سلة المهملات)
const listTrash = asyncHandler(async (req, res) => {
  const items = await prisma.item.findMany({ where: { isActive: false }, include: { category: true }, orderBy: { updatedAt: 'desc' } });
  res.json({ success: true, data: items });
});

// POST /api/items/trash/:id/restore — استرجاع صنف من سلة المهملات
const restoreItem = asyncHandler(async (req, res) => {
  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.item.update({ where: { id: req.params.id }, data: { isActive: true } });
    await logActivity({ action: 'UPDATE', entityType: 'Item', entityId: updated.id, description: `استرجاع صنف "${updated.name}" من سلة المهملات`, userId: req.user.id, tx });
    return updated;
  });
  res.json({ success: true, data: item });
});

// DELETE /api/items/trash/:id/permanent — حذف نهائي (لو مرتبط بأي حركة سابقة هيفشل ويرجع رسالة واضحة)
const permanentDeleteItem = asyncHandler(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError('الصنف غير موجود', 404);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stockLevel.deleteMany({ where: { itemId: req.params.id } });
      await tx.item.delete({ where: { id: req.params.id } });
      await logActivity({ action: 'DELETE', entityType: 'Item', entityId: req.params.id, description: `حذف نهائي لصنف "${item.name}" — لا يمكن التراجع`, userId: req.user.id, tx });
    });
  } catch (err) {
    throw new AppError('تعذر الحذف النهائي — الصنف له حركة سابقة (صرف/مرتجع/فاقد) في السجلات ولازم تفضل محفوظة كأرشيف', 400);
  }
  res.json({ success: true, message: 'تم الحذف النهائي للصنف' });
});

module.exports.listTrash = listTrash;
module.exports.restoreItem = restoreItem;
module.exports.permanentDeleteItem = permanentDeleteItem;

/**
 * استيراد أصناف بالجملة من ملف Excel.
 * الأعمدة المتوقعة (بالترتيب): اسم الصنف | التصنيف | الوحدة | الحد الأدنى | الكمية الابتدائية | اسم المخزن
 * (الصف الأول عنوان ويتم تجاهله؛ الأعمدة الأخيرة اختيارية)
 */
const importFromExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('لم يتم إرفاق أي ملف', 400);

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError('الملف فارغ أو غير صالح', 400);

  const results = { created: 0, errors: [] };

  await prisma.$transaction(async (tx) => {
    const categoryCache = new Map();
    const warehouseCache = new Map();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const name = String(row.getCell(1).value || '').trim();
      if (!name) continue; // صف فاضي، تخطاه

      const categoryName = String(row.getCell(2).value || '').trim();
      const unit = String(row.getCell(3).value || 'قطعة').trim();
      const minQuantity = Number(row.getCell(4).value || 0);
      const initialQuantity = Number(row.getCell(5).value || 0);
      const warehouseName = String(row.getCell(6).value || '').trim();

      try {
        if (!categoryName) throw new Error('التصنيف مطلوب');

        let categoryId = categoryCache.get(categoryName);
        if (!categoryId) {
          const category = await tx.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
          categoryId = category.id;
          categoryCache.set(categoryName, categoryId);
        }

        // نحدد المخزن الأولي الأول (لو موجود) قبل إنشاء الصنف عشان نربطه بيه من البداية
        let warehouseId = null;
        if (warehouseName && initialQuantity > 0) {
          warehouseId = warehouseCache.get(warehouseName);
          if (!warehouseId) {
            const warehouse = await tx.warehouse.findFirst({ where: { name: warehouseName } });
            if (warehouse) {
              warehouseId = warehouse.id;
              warehouseCache.set(warehouseName, warehouseId);
            }
          }
        }

        // لو أصلاً فيه صنف بنفس الاسم ونفس التصنيف، ندمج فيه بدل ما نكرره
        const existingItem = await tx.item.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, categoryId, isActive: true },
        });

        if (existingItem) {
          if (warehouseName && initialQuantity > 0) {
            if (warehouseId) {
              await tx.stockLevel.upsert({
                where: { itemId_warehouseId: { itemId: existingItem.id, warehouseId } },
                update: { quantity: { increment: initialQuantity } },
                create: { itemId: existingItem.id, warehouseId, quantity: initialQuantity, minQuantity: minQuantity || 0 },
              });
              results.merged = (results.merged || 0) + 1;
            } else {
              results.errors.push(`الصف ${rowNumber} (${name}): المخزن "${warehouseName}" غير موجود — تم تخطي الكمية`);
            }
          } else {
            results.merged = (results.merged || 0) + 1;
          }
          continue;
        }

        const code = await generateCode('item');
        const item = await tx.item.create({
          data: {
            code,
            name,
            categoryId,
            unit,
            minQuantity,
          },
        });

        if (warehouseName && initialQuantity > 0) {
          if (warehouseId) {
            await tx.stockLevel.create({ data: { itemId: item.id, warehouseId, quantity: initialQuantity, minQuantity: minQuantity || 0 } });
          } else {
            results.errors.push(`الصف ${rowNumber} (${name}): المخزن "${warehouseName}" غير موجود — تم إضافة الصنف بدون كمية ابتدائية`);
          }
        }

        results.created += 1;
      } catch (err) {
        results.errors.push(`الصف ${rowNumber} (${name || 'بدون اسم'}): ${err.message}`);
      }
    }

    await logActivity({
      action: 'CREATE',
      entityType: 'Item',
      entityId: 'bulk-import',
      description: `استيراد جماعي: تم إضافة ${results.created} صنف من ملف Excel`,
      userId: req.user.id,
      tx,
    });
  });

  res.status(201).json({ success: true, data: results });
});

module.exports.importFromExcel = importFromExcel;

/**
 * GET /api/items/:id/detail — نظرة شاملة على صنف معين:
 * - الكمية اللي دخل بيها أول مرة (initialQuantity)
 * - الكمية الحالية في كل مخزن + كام دخل/خرج/فاقد في كل مخزن
 * - إجمالي "لسه برا" (خرج من كل الحفلات ومارجعش) على مستوى النظام كله
 * - إجمالي الفاقد على مستوى النظام كله
 * - كام حفلة الصنف ده موزّع عليها دلوقتي (لسه برا فيها)
 */
const getDetail = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const item = await prisma.item.findUnique({ where: { id: itemId }, include: { category: true } });
  if (!item) throw new AppError('الصنف غير موجود', 404);

  const [stockLevels, issueLines, returnLines, lossLines, transferLines, custodyLines] = await Promise.all([
    prisma.stockLevel.findMany({ where: { itemId, warehouse: { deletedAt: null } }, include: { warehouse: true } }),
    prisma.issueVoucherItem.findMany({
      where: { itemId, voucher: { status: 'CONFIRMED' } },
      select: { quantity: true, voucher: { select: { warehouseId: true, eventId: true, warehouse: { select: { name: true } } } } },
    }),
    prisma.returnVoucherItem.findMany({
      where: { itemId, voucher: { status: 'CONFIRMED' } },
      select: { returnedQuantity: true, damagedQuantity: true, voucher: { select: { warehouseId: true, eventId: true } } },
    }),
    prisma.lossRecord.findMany({ where: { itemId, status: 'CONFIRMED' }, select: { quantity: true, warehouseId: true, eventId: true } }),
    prisma.stockTransferItem.findMany({
      where: { itemId },
      select: { quantity: true, transfer: { select: { fromWarehouseId: true, toWarehouseId: true } } },
    }),
    // نقل عهدة بين حفلتين — بيأثر على حساب "لسه برا" وعدد الحفلات بس، مش على المخازن (مفيهوش تحريك فعلي للمخزون)
    prisma.custodyTransferItem.findMany({
      where: { itemId, transfer: { status: 'CONFIRMED' } },
      select: { quantity: true, transfer: { select: { fromEventId: true, toEventId: true, fromEvent: { select: { name: true } } } } },
    }),
  ]);

  // ============ إجمالي النظام: لسه برا + فاقد ============
  // ملحوظة: نقل العهدة بين حفلتين "محايد" على المستوى العام (بيتحرك مش بيتزود أو ينقص)،
  // فمش محتاجينه هنا — هو مهم بس في التوزيع على كل حفلة لوحدها تحت
  const totalIssued = issueLines.reduce((s, l) => s + l.quantity, 0);
  const totalReturned = returnLines.reduce((s, l) => s + l.returnedQuantity + l.damagedQuantity, 0);
  const totalLost = lossLines.reduce((s, l) => s + l.quantity, 0);
  const totalStillOut = Math.max(totalIssued - totalReturned - totalLost, 0);

  // ============ كام حفلة الصنف ده موزّع عليها دلوقتي (لسه برا فيها) ============
  const issuedByEvent = new Map();
  const sourcesByEvent = new Map(); // eventId -> [{ type, name, quantity }]
  function addEventSource(eventId, type, name, quantity) {
    if (quantity <= 0) return;
    if (!sourcesByEvent.has(eventId)) sourcesByEvent.set(eventId, []);
    const arr = sourcesByEvent.get(eventId);
    const existing = arr.find((s) => s.type === type && s.name === name);
    if (existing) existing.quantity += quantity;
    else arr.push({ type, name, quantity });
  }
  issueLines.forEach((l) => {
    const id = l.voucher.eventId;
    issuedByEvent.set(id, (issuedByEvent.get(id) || 0) + l.quantity);
    addEventSource(id, 'warehouse', l.voucher.warehouse?.name || '—', l.quantity);
  });
  const accountedByEvent = new Map();
  returnLines.forEach((l) => {
    const id = l.voucher.eventId;
    accountedByEvent.set(id, (accountedByEvent.get(id) || 0) + l.returnedQuantity + l.damagedQuantity);
  });
  lossLines.forEach((l) => {
    if (!l.eventId) return;
    accountedByEvent.set(l.eventId, (accountedByEvent.get(l.eventId) || 0) + l.quantity);
  });
  // عهدة خارجة من حفلة = اتحسبت على الحفلة المصدر (زي المرتجع) + بتتحسب "خرجت" على الحفلة الهدف
  custodyLines.forEach((l) => {
    accountedByEvent.set(l.transfer.fromEventId, (accountedByEvent.get(l.transfer.fromEventId) || 0) + l.quantity);
    issuedByEvent.set(l.transfer.toEventId, (issuedByEvent.get(l.transfer.toEventId) || 0) + l.quantity);
    addEventSource(l.transfer.toEventId, 'custody', l.transfer.fromEvent?.name || '—', l.quantity);
  });
  let eventsDistributedCount = 0;
  const stillOutSources = []; // [{ type, name, quantity }] على مستوى الصنف ككل
  issuedByEvent.forEach((issued, eventId) => {
    const accounted = accountedByEvent.get(eventId) || 0;
    const pending = issued - accounted;
    if (pending > 0) {
      eventsDistributedCount += 1;
      const sources = sourcesByEvent.get(eventId) || [];
      const totalSourceQty = sources.reduce((s, x) => s + x.quantity, 0) || 1;
      sources.forEach((src) => {
        const share = Math.round((src.quantity / totalSourceQty) * pending);
        if (share <= 0) return;
        const existing = stillOutSources.find((s) => s.type === src.type && s.name === src.name);
        if (existing) existing.quantity += share;
        else stillOutSources.push({ type: src.type, name: src.name, quantity: share });
      });
    }
  });

  // ============ تفصيل كل مخزن: دخل / خرج / فاقد / الرصيد الحالي ============
  const warehouseMap = new Map(); // warehouseId -> { warehouseId, warehouseName, current, in, out, lost }
  function ensureWarehouse(id, name) {
    if (!warehouseMap.has(id)) warehouseMap.set(id, { warehouseId: id, warehouseName: name, current: 0, in: 0, out: 0, lost: 0 });
    return warehouseMap.get(id);
  }

  stockLevels.forEach((s) => {
    ensureWarehouse(s.warehouseId, s.warehouse.name).current = s.quantity;
  });
  issueLines.forEach((l) => {
    if (!l.voucher.warehouseId) return;
    const row = warehouseMap.get(l.voucher.warehouseId);
    if (row) row.out += l.quantity;
  });
  returnLines.forEach((l) => {
    if (!l.voucher.warehouseId) return;
    const row = warehouseMap.get(l.voucher.warehouseId);
    if (row) row.in += l.returnedQuantity + l.damagedQuantity;
  });
  lossLines.forEach((l) => {
    if (!l.warehouseId) return;
    const row = warehouseMap.get(l.warehouseId);
    if (row) row.lost += l.quantity;
  });
  transferLines.forEach((l) => {
    const from = warehouseMap.get(l.transfer.fromWarehouseId);
    if (from) from.out += l.quantity;
    const to = warehouseMap.get(l.transfer.toWarehouseId);
    if (to) to.in += l.quantity;
  });

  res.json({
    success: true,
    data: {
      item,
      currentTotal: stockLevels.reduce((s, x) => s + x.quantity, 0),
      totalStillOut,
      totalLost,
      eventsDistributedCount,
      stillOutSources, // من أي مخزن (أو نقل عهدة من أي حفلة) طلعت الكمية اللي لسه برا
      warehouses: Array.from(warehouseMap.values()),
    },
  });
});

module.exports.getDetail = getDetail;
