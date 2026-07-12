const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { logActivity } = require('../services/activityLogger');

const list = asyncHandler(async (req, res) => {
  const { status, itemId } = req.query;
  const records = await prisma.maintenance.findMany({
    where: { ...(status && { status }), ...(itemId && { itemId }) },
    include: { item: true, user: { select: { fullName: true } } },
    orderBy: { startDate: 'desc' },
  });
  res.json({ success: true, data: records });
});

const create = asyncHandler(async (req, res) => {
  const { itemId, description, cost } = req.body;
  if (!itemId || !description) throw new AppError('الصنف ووصف الصيانة مطلوبان', 400);

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenance.create({
      data: { itemId, description, cost, userId: req.user.id },
      include: { item: true },
    });
    await logActivity({
      action: 'CREATE',
      entityType: 'Maintenance',
      entityId: created.id,
      description: `فتح أمر صيانة لـ ${created.item.name}: ${description}`,
      userId: req.user.id,
      tx,
    });
    return created;
  });

  res.status(201).json({ success: true, data: record });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, cost } = req.body;
  const record = await prisma.maintenance.update({
    where: { id: req.params.id },
    data: { status, cost, ...(status === 'COMPLETED' && { endDate: new Date() }) },
  });
  res.json({ success: true, data: record });
});

module.exports = { list, create, updateStatus };
