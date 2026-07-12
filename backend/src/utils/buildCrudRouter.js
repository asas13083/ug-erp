const express = require('express');
const createCrudController = require('./crudFactory');
const { requireAuth, requirePermission } = require('../middleware/auth');

/**
 * يبني راوتر Express كامل بعمليات CRUD قياسية (شامل سلة المهملات)، مربوط بنظام الصلاحيات الحر.
 * @param {string} model - اسم الموديل في Prisma
 * @param {string} entityLabel - الاسم العربي للعنصر
 * @param {object} options - { searchFields, include, module, openListToAnyUser }
 * module: مفتاح القسم في نظام الصلاحيات (من utils/modules.js)
 * openListToAnyUser: لو true، قائمة العناصر (GET /) بتبقى متاحة لأي مستخدم
 *   مسجّل دخول من غير فحص صلاحية القسم — مفيد للأقسام اللي بتتستخدم كـ"قايمة
 *   مرجعية" في أذونات تانية (زي المخازن في إذن الصرف) حتى لو اليوزر مالوش
 *   صلاحية على قسم إدارة المخازن نفسه. باقي العمليات (تفاصيل/إضافة/تعديل/حذف)
 *   بتفضل محمية بصلاحية القسم زي العادة.
 */
function buildCrudRouter(model, entityLabel, options = {}) {
  const router = express.Router();
  const { module, openListToAnyUser } = options;
  if (!module) throw new Error(`buildCrudRouter لـ "${model}" محتاج تمرير اسم القسم (module) لربطه بنظام الصلاحيات`);
  const ctrl = createCrudController(model, entityLabel, options);

  router.use(requireAuth);
  router.get('/trash/list', requirePermission(module, 'delete'), ctrl.listTrash);
  router.post('/trash/:id/restore', requirePermission(module, 'delete'), ctrl.restore);
  router.delete('/trash/:id/permanent', requirePermission(module, 'delete'), ctrl.permanentDelete);
  router.get('/', openListToAnyUser ? (req, res, next) => next() : requirePermission(module, 'view'), ctrl.list);
  router.get('/:id', requirePermission(module, 'view'), ctrl.getOne);
  router.post('/', requirePermission(module, 'create'), ctrl.create);
  router.put('/:id', requirePermission(module, 'edit'), ctrl.update);
  router.delete('/:id', requirePermission(module, 'delete'), ctrl.remove);

  return router;
}

module.exports = buildCrudRouter;
