const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { buildActivityLogScope } = require('../utils/eventScope');

router.use(requireAuth);

// GET /api/notifications — آخر العمليات (مقيّدة لحفلات المستخدم لو هو مقيّد)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const scopeFilter = await buildActivityLogScope(req.user.id);
    const logs = await prisma.activityLog.findMany({
      where: scopeFilter || {},
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: logs });
  })
);

module.exports = router;
