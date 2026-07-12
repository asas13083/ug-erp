const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/item.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);
router.get('/trash/list', requirePermission('items', 'delete'), ctrl.listTrash);
router.post('/trash/:id/restore', requirePermission('items', 'delete'), ctrl.restoreItem);
router.delete('/trash/:id/permanent', requirePermission('items', 'delete'), ctrl.permanentDeleteItem);
// قائمة الأصناف نفسها متاحة لأي مستخدم مسجّل دخول من غير فحص صلاحية "items"
// تحديداً — عشان لازمة كقائمة مرجعية وقت اختيار الأصناف جوه أي إذن (صرف/مرتجع/
// نقل عهدة)، حتى لو اليوزر مالوش صلاحية على قسم إدارة الأصناف نفسه. تفاصيل
// الصنف الكاملة والتعديل والحذف بيفضلوا محتاجين الصلاحية زي العادة.
router.get('/', ctrl.list);
router.get('/:id', requirePermission('items', 'view'), ctrl.getOne);
router.get('/:id/detail', ctrl.getDetail);
router.post('/', requirePermission('items', 'create'), ctrl.create);
router.post('/import', requirePermission('items', 'create'), upload.single('file'), ctrl.importFromExcel);
router.put('/:id', requirePermission('items', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('items', 'delete'), ctrl.remove);

module.exports = router;
