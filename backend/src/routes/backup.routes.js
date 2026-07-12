const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { runBackup, listBackups, restoreBackup, BACKUP_DIR } = require('../services/backupService');
const { isConfigured: driveConfigured, uploadBackupToDrive } = require('../services/googleDriveService');
const { uploadBackup, TEMP_RESTORE_DIR } = require('../middleware/uploadBackup');
const { logActivity } = require('../services/activityLogger');

router.use(requireAuth);
router.use(requirePermission('settings', 'view'));

// GET /api/backups/drive-status — هل الرفع على جوجل درايف متظبط ولا لأ
router.get(
  '/drive-status',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { configured: driveConfigured() } });
  })
);

// POST /api/backups/:filename/upload-to-drive — رفع نسخة موجودة على جوجل درايف يدوياً
router.post(
  '/:filename/upload-to-drive',
  requirePermission('settings', 'create'),
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!/^(backup|uploads)-[\w.-]+\.(sql|tar\.gz)$/.test(filename)) {
      throw new AppError('اسم الملف غير صالح', 400);
    }
    if (!driveConfigured()) {
      throw new AppError('الرفع على جوجل درايف مش متظبط لسه — راجع دليل الإعداد', 400);
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) throw new AppError('الملف غير موجود', 404);

    const result = await uploadBackupToDrive(filepath, filename);
    res.json({ success: true, message: 'تم الرفع على جوجل درايف بنجاح', data: result });
  })
);

// GET /api/backups — قائمة النسخ الاحتياطية الموجودة
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: listBackups() });
  })
);

// POST /api/backups/run — تشغيل نسخة احتياطية يدوية فوراً
router.post(
  '/run',
  requirePermission('settings', 'create'),
  asyncHandler(async (req, res) => {
    const filename = await runBackup();
    res.status(201).json({ success: true, message: 'تم إنشاء نسخة احتياطية جديدة بنجاح', data: { filename } });
  })
);

// GET /api/backups/:filename/download — تحميل نسخة احتياطية معينة
router.get(
  '/:filename/download',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!/^(backup|uploads)-[\w.-]+\.(sql|tar\.gz)$/.test(filename)) {
      throw new AppError('اسم الملف غير صالح', 400);
    }
    const filepath = path.join(BACKUP_DIR, filename);
    res.download(filepath, filename, (err) => {
      if (err) throw new AppError('الملف غير موجود', 404);
    });
  })
);

// POST /api/backups/:filename/restore — استرجاع نسخة موجودة على السيرفر بالفعل
// عملية خطيرة جداً: بتمسح كل البيانات الحالية وتستبدلها. محتاجة صلاحية
// "حذف" في الإعدادات (أعلى صلاحية متاحة) + تأكيد صريح (confirmText) من الفرونت إند
router.post(
  '/:filename/restore',
  requirePermission('settings', 'delete'),
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { confirmText } = req.body;
    if (confirmText !== 'استرجاع') {
      throw new AppError('لازم تكتب كلمة التأكيد بالظبط عشان نكمل العملية دي', 400);
    }
    if (!/^backup-[\w.-]+\.sql$/.test(filename)) {
      throw new AppError('اسم الملف غير صالح — الاسترجاع بيشتغل على نسخ قاعدة البيانات (.sql) بس', 400);
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) throw new AppError('الملف غير موجود', 404);

    const { safetyBackupFilename } = await restoreBackup(filepath);

    await logActivity({
      action: 'RESTORE',
      entityType: 'Backup',
      entityId: filename,
      description: `استرجاع نسخة احتياطية: ${filename} — تم أخذ نسخة أمان قبلها: ${safetyBackupFilename}`,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `تم استرجاع النسخة الاحتياطية بنجاح. اتاخدت نسخة أمان من الحالة اللي كانت قبل الاسترجاع باسم: ${safetyBackupFilename}`,
      data: { safetyBackupFilename },
    });
  })
);

// POST /api/backups/restore-upload — استرجاع من ملف .sql مرفوع مباشرة
router.post(
  '/restore-upload',
  requirePermission('settings', 'delete'),
  uploadBackup.single('file'),
  asyncHandler(async (req, res) => {
    const { confirmText } = req.body;
    if (!req.file) throw new AppError('لازم ترفع ملف .sql', 400);

    if (confirmText !== 'استرجاع') {
      fs.unlinkSync(req.file.path);
      throw new AppError('لازم تكتب كلمة التأكيد بالظبط عشان نكمل العملية دي', 400);
    }

    try {
      const { safetyBackupFilename } = await restoreBackup(req.file.path);

      await logActivity({
        action: 'RESTORE',
        entityType: 'Backup',
        entityId: req.file.originalname,
        description: `استرجاع نسخة احتياطية من ملف مرفوع: ${req.file.originalname} — تم أخذ نسخة أمان قبلها: ${safetyBackupFilename}`,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: `تم استرجاع النسخة الاحتياطية بنجاح. اتاخدت نسخة أمان من الحالة اللي كانت قبل الاسترجاع باسم: ${safetyBackupFilename}`,
        data: { safetyBackupFilename },
      });
    } finally {
      // نمسح الملف المؤقت المرفوع فوراً، سواء نجح الاسترجاع أو فشل
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
  })
);

module.exports = router;
