const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { AppError } = require('../utils/errors');
const { buildActivityLogScope } = require('../utils/eventScope');

router.use(requireAuth);

// GET /api/activity-log?action=&entityType=&dateFrom=&dateTo=&page=&pageSize=
router.get(
  '/',
  requirePermission('activityLog', 'view'),
  asyncHandler(async (req, res) => {
    const { action, entityType } = req.query;
    const { page, pageSize, skip, take } = getPagination(req, 30);
    const scopeFilter = await buildActivityLogScope(req.user.id);
    const where = { ...(action && { action }), ...(entityType && { entityType }), ...buildDateRangeFilter(req), ...(scopeFilter || {}) };
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({ where, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.activityLog.count({ where }),
    ]);
    res.json({ success: true, data: logs, meta: buildMeta(page, pageSize, total) });
  })
);

// GET /api/activity-log/email-queue — عرض حالة طابور الإيميل
router.get(
  '/email-queue',
  requirePermission('emailNotifications', 'view'),
  asyncHandler(async (req, res) => {
    const queue = await prisma.emailQueue.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ success: true, data: queue });
  })
);

// DELETE /api/activity-log/email-queue/:id — إلغاء رسالة في الطابور قبل ما تتبعت
router.delete(
  '/email-queue/:id',
  requirePermission('emailNotifications', 'delete'),
  asyncHandler(async (req, res) => {
    await prisma.emailQueue.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'تم إلغاء الرسالة من الطابور' });
  })
);

// PUT /api/activity-log/email-queue/:id — إعادة محاولة إرسال رسالة فشلت (يرجعها PENDING)
router.put(
  '/email-queue/:id',
  requirePermission('emailNotifications', 'edit'),
  asyncHandler(async (req, res) => {
    const updated = await prisma.emailQueue.update({
      where: { id: req.params.id },
      data: { status: 'PENDING', attempts: 0, lastError: null },
    });
    res.json({ success: true, data: updated });
  })
);

// DELETE /api/activity-log/email-queue?status=SENT|FAILED — مسح جماعي للرسائل الناجحة أو الفاشلة (تنظيف الطابور)
router.delete(
  '/email-queue',
  requirePermission('emailNotifications', 'delete'),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    if (!['SENT', 'FAILED'].includes(status)) {
      throw new AppError('حدد حالة صحيحة للمسح: SENT أو FAILED', 400);
    }
    const result = await prisma.emailQueue.deleteMany({ where: { status } });
    res.json({ success: true, message: `تم مسح ${result.count} رسالة` });
  })
);

module.exports = router;
