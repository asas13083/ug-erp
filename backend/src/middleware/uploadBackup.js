const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ملفات SQL المرفوعة للاسترجاع بتتحط في مكان مؤقت منفصل، وبتتمسح فوراً
// بعد ما الاسترجاع يخلص (سواء نجح أو فشل) — عشان محدش يسيب ملف SQL كامل
// فيه كل بيانات الشركة على السيرفر أكتر من اللازم
const TEMP_RESTORE_DIR = path.join(__dirname, '../../backups/.tmp-restore');
if (!fs.existsSync(TEMP_RESTORE_DIR)) fs.mkdirSync(TEMP_RESTORE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_RESTORE_DIR),
  filename: (req, file, cb) => cb(null, `restore-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.sql`),
});

const uploadBackup = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 ميجا كافية جداً لملف SQL نصي
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.sql')) {
      return cb(new Error('لازم يكون ملف .sql بس'));
    }
    cb(null, true);
  },
});

module.exports = { uploadBackup, TEMP_RESTORE_DIR };
