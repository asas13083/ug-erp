const prisma = require('../lib/prisma');
const asyncHandler = require('./asyncHandler');
const { AppError } = require('./errors');
const { logActivity } = require('../services/activityLogger');
const { getPagination, buildMeta } = require('./pagination');

/**
 * ينشئ عمليات CRUD قياسية (list, get, create, update, حذف ناعم + سلة مهملات) لأي موديل.
 * يُستخدم للموديلات البسيطة اللي مش محتاجة منطق خاص (تصنيفات، عملاء، موردين، مخازن...)
 *
 * الحذف هنا "ناعم" (Soft Delete): بيحط تاريخ في عمود deletedAt بدل ما يمسح السجل نهائياً،
 * فيبقى ينفع يترجع من "سلة المهملات" أو يتمسح نهائياً بعد كده لو حبيت.
 *
 * @param {string} model - اسم الموديل في Prisma (حرف أول صغير), مثل 'category'
 * @param {string} entityLabel - اسم عربي للعنصر يُستخدم في سجل الحركة، مثل 'تصنيف'
 * @param {object} options - { searchFields: [], include: {} }
 */
function createCrudController(model, entityLabel, options = {}) {
  const { searchFields = ['name'], include = undefined, entityType = entityLabel } = options;

  const list = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const { page, pageSize, skip, take } = getPagination(req, 50);
    const where = {
      deletedAt: null,
      ...(q && { OR: searchFields.map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })) }),
    };

    const [items, total] = await Promise.all([
      prisma[model].findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma[model].count({ where }),
    ]);
    res.json({ success: true, data: items, meta: buildMeta(page, pageSize, total) });
  });

  const getOne = asyncHandler(async (req, res) => {
    const item = await prisma[model].findUnique({ where: { id: req.params.id }, include });
    if (!item || item.deletedAt) throw new AppError(`${entityLabel} غير موجود`, 404);
    res.json({ success: true, data: item });
  });

  const create = asyncHandler(async (req, res) => {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx[model].create({ data: req.body });
      await logActivity({
        action: 'CREATE',
        entityType,
        entityId: created.id,
        description: `إضافة ${entityLabel}: ${created.name || created.id}`,
        userId: req.user.id,
        tx,
      });
      return created;
    });
    res.status(201).json({ success: true, data: item });
  });

  const update = asyncHandler(async (req, res) => {
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx[model].update({ where: { id: req.params.id }, data: req.body });
      await logActivity({
        action: 'UPDATE',
        entityType,
        entityId: updated.id,
        description: `تعديل ${entityLabel}: ${updated.name || updated.id}`,
        userId: req.user.id,
        tx,
      });
      return updated;
    });
    res.json({ success: true, data: item });
  });

  // حذف ناعم — بينقل العنصر لسلة المهملات بدل ما يمسحه نهائياً
  const remove = asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const item = await tx[model].update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
      await logActivity({
        action: 'DELETE',
        entityType,
        entityId: req.params.id,
        description: `نقل ${entityLabel} "${item.name || item.id}" لسلة المهملات`,
        userId: req.user.id,
        tx,
      });
    });
    res.json({ success: true, message: `تم نقل ${entityLabel} لسلة المهملات` });
  });

  // GET /trash — عرض كل العناصر المحذوفة (في سلة المهملات) لهذا القسم
  const listTrash = asyncHandler(async (req, res) => {
    const items = await prisma[model].findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } });
    res.json({ success: true, data: items });
  });

  // POST /:id/restore — استرجاع عنصر من سلة المهملات
  const restore = asyncHandler(async (req, res) => {
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx[model].update({ where: { id: req.params.id }, data: { deletedAt: null } });
      await logActivity({
        action: 'UPDATE',
        entityType,
        entityId: updated.id,
        description: `استرجاع ${entityLabel} "${updated.name || updated.id}" من سلة المهملات`,
        userId: req.user.id,
        tx,
      });
      return updated;
    });
    res.json({ success: true, data: item });
  });

  // DELETE /:id/permanent — حذف نهائي من قاعدة البيانات (لا رجعة فيه)
  const permanentDelete = asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const item = await tx[model].delete({ where: { id: req.params.id } });
      await logActivity({
        action: 'DELETE',
        entityType,
        entityId: req.params.id,
        description: `حذف نهائي لـ ${entityLabel} "${item.name || item.id}" — لا يمكن التراجع`,
        userId: req.user.id,
        tx,
      });
    });
    res.json({ success: true, message: `تم الحذف النهائي لـ ${entityLabel}` });
  });

  return { list, getOne, create, update, remove, listTrash, restore, permanentDelete };
}

module.exports = createCrudController;
