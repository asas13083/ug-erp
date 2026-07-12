const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/event.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requirePermission('events', 'view'), ctrl.list);
// قائمة أسماء الحفلات كلها (بدون تقييد نطاق المستخدم) — مستخدمة بس في اختيار
// "الحفلة المستقبِلة" جوه شاشة نقل العهدة، عشان تقدر تنقل عهدة لحفلة مش
// معيّن عليها أصلاً. المستخدم برضو لازم يقدر يعمل نقل عهدة أساساً (صلاحية
// custodyTransfers) عشان يشوف القائمة دي — مش أي مستخدم عادي.
router.get('/list-for-custody-transfer', requirePermission('custodyTransfers', 'create'), ctrl.listForCustodyTransfer);
router.get('/:id', requirePermission('events', 'view'), ctrl.getOne);
router.get('/:id/assignments', requirePermission('events', 'view'), ctrl.listAssignments);
router.put('/:id/assignments', requirePermission('events', 'edit'), ctrl.setAssignments);
router.post('/', requirePermission('events', 'create'), ctrl.create);
router.put('/:id', requirePermission('events', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('events', 'delete'), ctrl.remove);

module.exports = router;
