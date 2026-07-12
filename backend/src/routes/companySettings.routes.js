const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

router.use(requireAuth);

// GET /api/company-settings — متاحة لأي مستخدم مسجل دخول (تُستخدم في التقارير والمستندات)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await prisma.companySettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    res.json({ success: true, data: settings });
  })
);

// PUT /api/company-settings — تعديل بيانات الشركة (الأدمن بس)
router.put(
  '/',
  requirePermission('settings', 'edit'),
  asyncHandler(async (req, res) => {
    const { companyName, phone, address, email } = req.body;
    const settings = await prisma.companySettings.upsert({
      where: { id: 'singleton' },
      update: { companyName, phone, address, email },
      create: { id: 'singleton', companyName, phone, address, email },
    });
    await logActivity({ action: 'UPDATE', entityType: 'CompanySettings', entityId: 'singleton', description: 'تعديل إعدادات الشركة', userId: req.user.id });
    res.json({ success: true, data: settings });
  })
);

module.exports = router;
