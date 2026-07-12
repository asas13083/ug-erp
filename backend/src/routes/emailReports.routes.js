const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { queueDailyReport, queueMonthlyReport } = require('../services/reportEmailService');

router.use(requireAuth);
router.use(requirePermission('emailNotifications', 'create'));

// POST /api/email-reports/daily  body: { date? } (افتراضياً النهاردة)
router.post(
  '/daily',
  asyncHandler(async (req, res) => {
    await queueDailyReport(req.body.date);
    res.json({ success: true, message: 'تم إضافة التقرير اليومي لطابور الإرسال — هيتبعت أول ما يكون في اتصال بالإنترنت' });
  })
);

// POST /api/email-reports/monthly  body: { month? } (افتراضياً الشهر الحالي)
router.post(
  '/monthly',
  asyncHandler(async (req, res) => {
    await queueMonthlyReport(req.body.month);
    res.json({ success: true, message: 'تم إضافة التقرير الشهري لطابور الإرسال — هيتبعت أول ما يكون في اتصال بالإنترنت' });
  })
);

module.exports = router;
