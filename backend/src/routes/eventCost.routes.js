const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/eventCost.controller');

router.use(requireAuth);
router.use(requirePermission('accounts', 'view'));

// ============ قايمة الحفلات بالإجمالي وعدد أيام العمالة (لصفحة الحسابات الرئيسية) ============
router.get('/events-list', ctrl.getEventsWithTotals);
router.get('/events-list/export.xlsx', ctrl.exportEventsListExcel);

// ============ تقرير المقارنة (قبل مسار :eventId عشان مايتلخبطش معاه) ============
router.get('/comparison', ctrl.getComparisonReport);
router.get('/comparison/export.xlsx', ctrl.exportComparisonExcel);

// ============ ملخص كشف حفلة معينة ============
router.get('/:eventId/summary', ctrl.getSummary);
router.get('/:eventId/export.xlsx', ctrl.exportExcel);
router.get('/:eventId/transport-suggestions', ctrl.getTransportSuggestions);

// ============ بنود التوتال ============
router.post('/:eventId/items', requirePermission('accounts', 'create'), ctrl.createItem);
router.put('/items/:id', requirePermission('accounts', 'edit'), ctrl.updateItem);
router.delete('/items/:id', requirePermission('accounts', 'delete'), ctrl.removeItem);

// ============ الحركات اليومية المتراكمة ============
router.get('/:eventId/entries', ctrl.listEntries);
router.get('/:eventId/entries/export.xlsx', ctrl.exportEntriesExcel);
router.post('/:eventId/entries', requirePermission('accounts', 'create'), ctrl.createEntry);
router.put('/entries/:id', requirePermission('accounts', 'edit'), ctrl.updateEntry);
router.delete('/entries/:id', requirePermission('accounts', 'delete'), ctrl.removeEntry);

// ============ نسخ كشف من حفلة سابقة ============
router.post('/:eventId/copy-from/:sourceEventId', requirePermission('accounts', 'create'), ctrl.copyFromEvent);

// ============ الموردين على الحفلة ============
const supplierCtrl = require('../controllers/supplier.controller');

router.get('/:eventId/suppliers', requirePermission('accounts', 'view'), supplierCtrl.listEventEntries);
router.get('/:eventId/suppliers/export-excel', requirePermission('accounts', 'view'), supplierCtrl.exportEventSuppliersExcel);
router.post('/:eventId/suppliers', requirePermission('accounts', 'create'), supplierCtrl.createEventEntry);
router.put('/suppliers/:id', requirePermission('accounts', 'edit'), supplierCtrl.updateEventEntry);
router.delete('/suppliers/:id', requirePermission('accounts', 'delete'), supplierCtrl.deleteEventEntry);

module.exports = router;
