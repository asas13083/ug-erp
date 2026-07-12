const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');
const { MODULE_KEYS } = require('../utils/modules');

// يحوّل قائمة صلاحيات الدور لشكل سهل الاستخدام في الفرونت إند:
// { items: {canView:true, canCreate:false, ...}, warehouses: {...} }
function permissionsMapFromRole(role) {
  const map = {};
  MODULE_KEYS.forEach((key) => {
    const p = role.permissions.find((x) => x.module === key);
    map[key] = {
      canView: !!p?.canView,
      canCreate: !!p?.canCreate,
      canEdit: !!p?.canEdit,
      canDelete: !!p?.canDelete,
    };
  });
  return map;
}

// المدة الافتراضية للجلسة — 8 ساعات، بنستخدمها في توليد الـJWT وفي عمر الكوكيز
// بنفس القيمة بالظبط عشان الاتنين يتزامنوا صح
const SESSION_MS = 8 * 60 * 60 * 1000;

function setAuthCookie(res, token) {
  res.cookie('ug_erp_token', token, {
    httpOnly: true, // أهم إعداد — يمنع أي كود JavaScript (حتى لو فيه ثغرة XSS) من قراءة التوكن خالص
    secure: process.env.NODE_ENV === 'production', // https بس في الإنتاج (محلياً بيشتغل عادي على http)
    sameSite: 'lax', // حماية إضافية من هجمات CSRF من مواقع تانية
    maxAge: SESSION_MS,
    path: '/',
  });
}

// POST /api/auth/login
const { checkLoginLock, recordFailedAttempt, clearAttempts } = require('../middleware/loginRateLimit');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new AppError('اسم المستخدم وكلمة المرور مطلوبان', 400);
  }

  const user = await prisma.user.findUnique({ where: { username }, include: { role: { include: { permissions: true } } } });
  if (!user || !user.isActive) {
    recordFailedAttempt(username);
    throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    recordFailedAttempt(username);
    throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
  }

  clearAttempts(username);

  const token = jwt.sign(
    { id: user.id, username: user.username, fullName: user.fullName, roleId: user.roleId, roleName: user.role.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await logActivity({
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    description: `تسجيل دخول: ${user.fullName}`,
    userId: user.id,
  });

  setAuthCookie(res, token);

  res.json({
    success: true,
    data: {
      user: { id: user.id, username: user.username, fullName: user.fullName, roleId: user.roleId, roleName: user.role.name, avatarUrl: user.avatarUrl },
      permissions: permissionsMapFromRole(user.role),
    },
  });
});

// POST /api/auth/logout — بيمسح كوكيز الجلسة فعلياً من المتصفح
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('ug_erp_token', { path: '/' });
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// GET /api/auth/me — بيانات المستخدم الحالي وصلاحياته (تُستدعى عند كل تحميل للتطبيق)
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { role: { include: { permissions: true } } },
  });
  if (!user) throw new AppError('المستخدم غير موجود', 404);

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role.name,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      permissions: permissionsMapFromRole(user.role),
    },
  });
});

// POST /api/auth/users — إنشاء مستخدم جديد
const createUser = asyncHandler(async (req, res) => {
  const { username, fullName, password, roleId, phone } = req.body;
  if (!username || !fullName || !password || !roleId) {
    throw new AppError('كل الحقول مطلوبة: اسم المستخدم، الاسم الكامل، كلمة المرور، الدور', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, fullName, passwordHash, roleId, phone },
    include: { role: true },
  });

  res.status(201).json({
    success: true,
    data: { id: user.id, username: user.username, fullName: user.fullName, roleName: user.role.name, phone: user.phone, isActive: user.isActive },
  });
});

// GET /api/auth/users — قائمة المستخدمين
// GET /api/auth/users/handover-list — قايمة مختصرة للمستخدمين، بس اللي
// أدوارهم متعلّم عليها "يظهر في قوائم التسليم/الاستلام" — متاحة لأي مستخدم
// مسجّل دخول (مش محتاجة صلاحية "users") لأنها لازمة كقايمة مرجعية جوه
// أذون الصرف والمرتجع ونقل العهدة
const listHandoverUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { appearsInHandoverLists: true } },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  res.json({ success: true, data: users });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleId: u.roleId,
      roleName: u.role.name,
      phone: u.phone,
      isActive: u.isActive,
      restrictToAssignedEvents: u.restrictToAssignedEvents,
      createdAt: u.createdAt,
    })),
  });
});

// PUT /api/auth/users/:id — تعديل بيانات مستخدم (الدور، الحالة، تقييد الحفلات)
const updateUser = asyncHandler(async (req, res) => {
  const { roleId, isActive, restrictToAssignedEvents, phone } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(roleId !== undefined && { roleId }),
      ...(isActive !== undefined && { isActive }),
      ...(restrictToAssignedEvents !== undefined && { restrictToAssignedEvents }),
      ...(phone !== undefined && { phone }),
    },
    include: { role: true },
  });
  res.json({
    success: true,
    data: { id: user.id, username: user.username, fullName: user.fullName, roleName: user.role.name, phone: user.phone, isActive: user.isActive, restrictToAssignedEvents: user.restrictToAssignedEvents },
  });
});

// PUT /api/auth/me/password — تغيير كلمة المرور الشخصية (أي مستخدم لنفسه)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError('كلمة المرور الحالية والجديدة مطلوبتان', 400);
  }
  if (newPassword.length < 6) {
    throw new AppError('كلمة المرور الجديدة لازم تكون 6 أحرف على الأقل', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AppError('كلمة المرور الحالية غير صحيحة', 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

module.exports = { login, logout, me, createUser, listUsers, changePassword, updateUser };

// GET /api/auth/users/:id/event-assignments — الحفلات المعيّن عليها مستخدم معين
const listUserEventAssignments = asyncHandler(async (req, res) => {
  const assignments = await prisma.eventAssignment.findMany({ where: { userId: req.params.id }, select: { eventId: true } });
  res.json({ success: true, data: assignments.map((a) => a.eventId) });
});

// PUT /api/auth/users/:id/event-assignments — استبدال كل حفلات المستخدم دفعة واحدة { eventIds: [] }
const setUserEventAssignments = asyncHandler(async (req, res) => {
  const { eventIds = [] } = req.body;
  await prisma.$transaction(async (tx) => {
    await tx.eventAssignment.deleteMany({ where: { userId: req.params.id } });
    if (eventIds.length > 0) {
      await tx.eventAssignment.createMany({ data: eventIds.map((eventId) => ({ eventId, userId: req.params.id })) });
    }
  });
  res.json({ success: true, message: 'تم تحديث الحفلات المعيّنة بنجاح' });
});

module.exports.listUserEventAssignments = listUserEventAssignments;
module.exports.setUserEventAssignments = setUserEventAssignments;

// DELETE /api/auth/users/:id — حذف مستخدم نهائياً
// لو له سجلات مرتبطة (أذون صرف/مرتجع سابقة...)، الحذف هيفشل بسبب الترابط،
// وهنرجّع رسالة واضحة تقترح "إيقاف" الحساب بدل الحذف بدل ما نمسح الأرشيف
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new AppError('مينفعش تحذف حسابك الشخصي وانت داخل بيه', 400);
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.eventAssignment.deleteMany({ where: { userId: req.params.id } });
      const deleted = await tx.user.delete({ where: { id: req.params.id } });
      await logActivity({ action: 'DELETE', entityType: 'User', entityId: req.params.id, description: `حذف مستخدم: ${deleted.fullName}`, userId: req.user.id, tx });
    });
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    if (err.code === 'P2003' || err.code === 'P2014') {
      throw new AppError('تعذر حذف المستخدم لأن له سجلات مرتبطة (أذون صرف أو مرتجع سابقة...) — استخدم "إيقاف الحساب" بدلاً من الحذف عشان يفضل الأرشيف سليم', 409);
    }
    throw err;
  }
});

module.exports.deleteUser = deleteUser;

// GET /api/auth/users/:id/history — كل الحفلات اللي اشتغل فيها المستخدم عبر الوقت + سجل حركته الكامل
const getUserHistory = asyncHandler(async (req, res) => {
  const [assignments, activityLogs] = await Promise.all([
    prisma.eventAssignment.findMany({
      where: { userId: req.params.id },
      include: { event: { include: { client: true } } },
      orderBy: { event: { startDate: 'desc' } },
    }),
    prisma.activityLog.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);
  res.json({
    success: true,
    data: {
      events: assignments.map((a) => a.event),
      activityLogs,
    },
  });
});

module.exports.getUserHistory = getUserHistory;

// POST /api/auth/me/avatar — رفع صورة شخصية للحساب الحالي
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('لم يتم إرفاق أي صورة', 400);
  const avatarUrl = `/uploads/${req.file.filename}`;
  await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl } });
  res.json({ success: true, data: { avatarUrl } });
});

module.exports.uploadAvatar = uploadAvatar;
module.exports.listHandoverUsers = listHandoverUsers;
