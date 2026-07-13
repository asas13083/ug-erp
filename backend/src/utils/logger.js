const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

/**
 * نظام سجل أخطاء منظّم — بيسجّل كل خطأ حقيقي (500) وكل حاجة مهمة في ملفات
 * منفصلة بتاريخها، عشان لو حصلت مشكلة على السيرفر، تقدر تعرف "حصل إيه
 * بالظبط ووقتي إيه" في ثواني، بدل ما تدوّر يدوي في الشاشة.
 *
 * error.log     → الأخطاء الحقيقية بس (500 — حاجة غير متوقعة في الكود)
 * combined.log  → كل حاجة (معلومات عادية + تحذيرات + أخطاء) مع بعض
 * الكونسول     → نفس الكلام، لسهولة المتابعة اللحظية وقت التطوير
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log'), maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
  ],
});

// جوه بيئة التطوير، نضيف الكونسول كمان عشان نشوف كل حاجة لحظياً وهي بتحصل.
// جوه بيئة الاختبار (test)، منضيفوش كونسول عشان مانلخبطش نتيجة الاختبارات
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

module.exports = logger;
