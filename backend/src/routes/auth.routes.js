const express = require('express');
const router = express.Router();
const { login, logout, me, createUser, listUsers, changePassword, uploadAvatar, updateUser, listUserEventAssignments, setUserEventAssignments, deleteUser, getUserHistory, listHandoverUsers } = require('../controllers/auth.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { checkLoginLock } = require('../middleware/loginRateLimit');
const { validateBody } = require('../utils/validateBody');
const { loginSchema, createUserSchema, changePasswordSchema } = require('../validation/auth.schema');

router.post('/login', checkLoginLock, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/me/password', requireAuth, validateBody(changePasswordSchema), changePassword);
router.post('/me/avatar', requireAuth, upload.single('file'), uploadAvatar);
router.get('/users', requireAuth, requirePermission('users', 'view'), listUsers);
// قايمة مختصرة (اسم فقط) للمستخدمين اللي أدوارهم متعلّم عليها "يظهروا في
// قوائم التسليم/الاستلام" — متاحة لأي مستخدم مسجّل دخول من غير صلاحية "users"
router.get('/users/handover-list', requireAuth, listHandoverUsers);
router.post('/users', requireAuth, requirePermission('users', 'create'), validateBody(createUserSchema), createUser);
router.put('/users/:id', requireAuth, requirePermission('users', 'edit'), updateUser);
router.delete('/users/:id', requireAuth, requirePermission('users', 'delete'), deleteUser);
router.get('/users/:id/history', requireAuth, requirePermission('users', 'view'), getUserHistory);
router.get('/users/:id/event-assignments', requireAuth, requirePermission('users', 'view'), listUserEventAssignments);
router.put('/users/:id/event-assignments', requireAuth, requirePermission('users', 'edit'), setUserEventAssignments);

module.exports = router;
