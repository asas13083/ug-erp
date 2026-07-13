const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');

const LOG_DIR = path.join(__dirname, '../../logs');

// GET /api/logs/errors — آخر سجلات الأخطاء الحقيقية (500) — عشان تعرف "حصل
// إيه بالظبط" من جوه البرنامج نفسه، من غير ما تحتاج تدخل السيرفر خالص
const getRecentErrors = asyncHandler(async (req, res) => {
  const filepath = path.join(LOG_DIR, 'error.log');
  if (!fs.existsSync(filepath)) {
    return res.json({ success: true, data: [] });
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  // آخر 100 سطر بس، الأحدث فوق
  const recent = lines.slice(-100).reverse();
  res.json({ success: true, data: recent });
});

module.exports = { getRecentErrors };
