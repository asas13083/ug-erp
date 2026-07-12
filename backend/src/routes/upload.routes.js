const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../utils/errors');

// POST /api/uploads — يرفع صورة (لوجو عميل مثلاً) ويرجع رابط نسبي لها
router.post(
  '/',
  requireAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  (req, res) => {
    if (!req.file) throw new AppError('لم يتم إرفاق أي ملف', 400);
    res.status(201).json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
  }
);

module.exports = router;
