const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { MODULES, MODULE_KEYS } = require('../utils/modules');
const { logActivity } = require('../services/activityLogger');

// GET /api/roles/modules — قائمة الأقسام المتاحة (يستخدمها الفرونت إند لرسم جدول الصلاحيات)
const listModules = (req, res) => {
  res.json({ success: true, data: MODULES });
};

// GET /api/roles
const list = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: roles });
});

// تحويل { items: {canView:true,...}, warehouses: {...} } لصفوف Permission جاهزة للحفظ
function buildPermissionRows(permissionsInput = {}) {
  return MODULE_KEYS.map((module) => {
    const p = permissionsInput[module] || {};
    return {
      module,
      canView: !!p.canView,
      canCreate: !!p.canCreate,
      canEdit: !!p.canEdit,
      canDelete: !!p.canDelete,
    };
  });
}

// POST /api/roles — إنشاء دور جديد باسم حر وصلاحيات مخصصة لكل قسم
const create = asyncHandler(async (req, res) => {
  const { name, permissions, appearsInHandoverLists } = req.body;
  if (!name || !name.trim()) throw new AppError('اسم الدور/الوظيفة مطلوب', 400);

  const rows = buildPermissionRows(permissions);

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.role.create({
      data: { name: name.trim(), appearsInHandoverLists: !!appearsInHandoverLists, permissions: { create: rows } },
      include: { permissions: true },
    });
    await logActivity({
      action: 'CREATE',
      entityType: 'Role',
      entityId: created.id,
      description: `إنشاء دور جديد: ${created.name}`,
      userId: req.user.id,
      tx,
    });
    return created;
  });

  res.status(201).json({ success: true, data: role });
});

// PUT /api/roles/:id — تعديل اسم الدور وصلاحياته
const update = asyncHandler(async (req, res) => {
  const { name, permissions, appearsInHandoverLists } = req.body;
  const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('الدور غير موجود', 404);

  const role = await prisma.$transaction(async (tx) => {
    if (name && name.trim()) {
      await tx.role.update({ where: { id: req.params.id }, data: { name: name.trim() } });
    }
    if (appearsInHandoverLists !== undefined) {
      await tx.role.update({ where: { id: req.params.id }, data: { appearsInHandoverLists: !!appearsInHandoverLists } });
    }
    if (permissions) {
      const rows = buildPermissionRows(permissions);
      for (const row of rows) {
        await tx.permission.upsert({
          where: { roleId_module: { roleId: req.params.id, module: row.module } },
          update: row,
          create: { ...row, roleId: req.params.id },
        });
      }
    }
    await logActivity({
      action: 'UPDATE',
      entityType: 'Role',
      entityId: req.params.id,
      description: `تعديل صلاحيات دور: ${existing.name}`,
      userId: req.user.id,
      tx,
    });
    return tx.role.findUnique({ where: { id: req.params.id }, include: { permissions: true } });
  });

  res.json({ success: true, data: role });
});

// DELETE /api/roles/:id — حذف دور (ممنوع لو أساسي أو مستخدم بالفعل)
const remove = asyncHandler(async (req, res) => {
  const role = await prisma.role.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } });
  if (!role) throw new AppError('الدور غير موجود', 404);
  if (role.isSystem) throw new AppError('لا يمكن حذف هذا الدور لأنه دور أساسي في النظام', 403);
  if (role._count.users > 0) throw new AppError(`لا يمكن حذف هذا الدور لأنه مستخدم من ${role._count.users} حساب — غيّر أدوارهم أولاً`, 409);

  await prisma.role.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'تم حذف الدور بنجاح' });
});

module.exports = { listModules, list, create, update, remove };
