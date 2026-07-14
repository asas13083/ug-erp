const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { isConfigured: driveConfigured, uploadBackupToDrive, pruneOldDriveBackups } = require('./googleDriveService');

const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const MAX_BACKUPS = 14; // الاحتفاظ بآخر 14 نسخة بس (تلقائياً بيمسح الأقدم)

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * يشغّل pg_dump وياخد نسخة احتياطية كاملة من قاعدة البيانات كملف SQL،
 * وكمان يضغط مجلد uploads (صور الأصناف/العملاء/المستخدمين) في ملف واحد
 * مرافق — عشان لو السيرفر اتبوّظ، الصور متضيعش زي قاعدة البيانات بالظبط.
 * محتاج pg_dump يكون متاح على الجهاز (بييجي مع تثبيت PostgreSQL نفسه،
 * عادة في مسار زي: C:\Program Files\PostgreSQL\16\bin).
 *
 * لو الرفع على جوجل درايف متظبط (GOOGLE_REFRESH_TOKEN موجود في .env)،
 * بيرفع النسختين (قاعدة البيانات + الصور) كمان تلقائياً هناك — بيحصل مع
 * كل نسخة، سواء يدوية أو مجدولة يومياً.
 */
async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const pgDumpCmd = process.env.PG_DUMP_PATH || 'pg_dump';

  const command = `"${pgDumpCmd}" "${process.env.DATABASE_URL}" -f "${filepath}" --no-owner --no-privileges`;
  await execAsync(command);

  // نسخة احتياطية للصور المرفوعة — بنفس التاريخ بالظبط، عشان تفضل مربوطة
  // بنسخة قاعدة البيانات المقابلة لها بسهولة
  const uploadsFilename = `uploads-${timestamp}.tar.gz`;
  let uploadsCreated = false;
  if (fs.existsSync(UPLOADS_DIR) && fs.readdirSync(UPLOADS_DIR).length > 0) {
    const uploadsFilepath = path.join(BACKUP_DIR, uploadsFilename);
    await execAsync(`tar -czf "${uploadsFilepath}" -C "${UPLOADS_DIR}" .`);
    uploadsCreated = true;
  }

  await pruneOldBackups();

  if (driveConfigured()) {
    try {
      await uploadBackupToDrive(filepath, filename);
      if (uploadsCreated) await uploadBackupToDrive(path.join(BACKUP_DIR, uploadsFilename), uploadsFilename);
      await pruneOldDriveBackups();
    } catch (err) {
      // فشل رفع جوجل درايف مايوقفش النسخة الاحتياطية المحلية — دي أهم حاجة
      // وخلصت بنجاح، الرفع على درايف إضافي بس
      console.error('تعذر رفع النسخة الاحتياطية على جوجل درايف:', err.message);
    }
  }

  return filename;
}

async function pruneOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.tar.gz'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  // بنحتفظ بآخر 14 من كل نوع (SQL و tar.gz) بشكل منفصل، مش مجموع الاتنين مع بعض
  const sqlFiles = files.filter((f) => f.name.endsWith('.sql'));
  const uploadsFiles = files.filter((f) => f.name.endsWith('.tar.gz'));
  [...sqlFiles.slice(MAX_BACKUPS), ...uploadsFiles.slice(MAX_BACKUPS)].forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f.name)));
}

function listBackups() {
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.tar.gz'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime, type: f.endsWith('.sql') ? 'database' : 'uploads' };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * نسخة احتياطية تلقائية في معاد ثابت — الساعة 12 بالظبط (منتصف الليل و12 الظهر)
 * بتوقيت القاهرة. مش "كل 12 ساعة من وقت ما السيرفر اشتغل" (اللي كان بيخلي
 * المعاد يتغيّر مع كل إعادة تشغيل)، لأ — معاد ثابت مضمون كل يوم.
 */
function startBackupScheduler() {
  const logger = require('../utils/logger');

  function msUntilNextRun() {
    // بنحسب الوقت بتوقيت القاهرة تحديداً (مش توقيت السيرفر اللي ممكن يكون UTC)
    const nowCairo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const next = new Date(nowCairo);
    const hour = nowCairo.getHours();

    if (hour < 12) {
      next.setHours(12, 0, 0, 0); // الساعة 12 الظهر النهاردة
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0); // 12 بالليل (بداية بكرة)
    }
    return next.getTime() - nowCairo.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNextRun();
    const hours = (delay / 3600000).toFixed(1);
    logger.info(`✓ النسخة الاحتياطية التلقائية الجاية بعد ${hours} ساعة (الساعة 12 بتوقيت القاهرة)`);

    setTimeout(async () => {
      try {
        await runBackup();
        logger.info('✓ النسخة الاحتياطية التلقائية تمت بنجاح');
      } catch (err) {
        logger.error('خطأ في النسخة الاحتياطية التلقائية: ' + err.message, { stack: err.stack });
      }
      scheduleNext(); // نجدول اللي بعدها مهما حصل (حتى لو دي فشلت)
    }, delay);
  }

  scheduleNext();
}

/**
 * يسترجع نسخة احتياطية كاملة فوق قاعدة البيانات الحالية — عملية خطيرة
 * وغير قابلة للتراجع، فبناخد نسخة احتياطية أمان تلقائية أول حاجة قبل أي
 * حذف، عشان حتى لو الاسترجاع نفسه غلط، يكون فيه طريق رجوع.
 *
 * بيمسح كل الجداول الحالية (DROP SCHEMA CASCADE) قبل ما يرجّع الملف —
 * عشان الملف يرجع بنجاح حتى لو الجداول أصلاً موجودة (مش بس على قاعدة فاضية).
 */
async function restoreBackup(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error('ملف النسخة الاحتياطية غير موجود');
  }

  // 1) نسخة أمان تلقائية للحالة الحالية — قبل ما نمسح أي حاجة
  const safetyBackupFilename = await runBackup();

  const psqlCmd = process.env.PSQL_PATH || 'psql';
  const dbUrl = process.env.DATABASE_URL;

  // 2) مسح كل الجداول الحالية (schema فاضي تماماً)
  await execAsync(`"${psqlCmd}" "${dbUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`);

  // 3) استرجاع الملف المطلوب فوق الـschema الفاضي
  await execAsync(`"${psqlCmd}" "${dbUrl}" -f "${filepath}"`);

  return { safetyBackupFilename };
}

module.exports = { runBackup, listBackups, startBackupScheduler, restoreBackup, BACKUP_DIR };
