const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roles.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.use(requireAuth);
router.get('/modules', ctrl.listModules); // متاحة لأي مستخدم مسجل دخول (تُستخدم في شاشات كتير)
router.get('/', requirePermission('users', 'view'), ctrl.list);
router.post('/', requirePermission('users', 'create'), ctrl.create);
router.put('/:id', requirePermission('users', 'edit'), ctrl.update);
router.delete('/:id', requirePermission('users', 'delete'), ctrl.remove);

module.exports = router;
