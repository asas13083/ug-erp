// خريطة في الذاكرة: اسم المستخدم -> { attempts: عدد المحاولات الفاشلة, lockedUntil: وقت انتهاء الحظر }
const attemptsMap = new Map();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 دقيقة حظر بعد تجاوز المحاولات
const WINDOW_MS = 15 * 60 * 1000; // نافذة الـ 15 دقيقة اللي بيتم عدّ المحاولات فيها

/** تُستدعى قبل محاولة الدخول — لو الحساب محظور مؤقتاً بيرفض الطلب فوراً */
function checkLoginLock(req, res, next) {
  const username = (req.body.username || '').toLowerCase().trim();
  if (!username) return next();

  const record = attemptsMap.get(username);
  if (record && record.lockedUntil && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      message: `تم إيقاف محاولات الدخول لهذا الحساب مؤقتاً بسبب محاولات فاشلة كتيرة. حاول تاني بعد ${minutesLeft} دقيقة`,
    });
  }
  next();
}

/** تُستدعى بعد فشل كلمة المرور — بتزود عداد المحاولات وتحظر لو تجاوز الحد */
function recordFailedAttempt(username) {
  const key = (username || '').toLowerCase().trim();
  if (!key) return;

  const now = Date.now();
  const record = attemptsMap.get(key) || { attempts: 0, firstAttemptAt: now, lockedUntil: null };

  // لو النافذة الزمنية انتهت، نبدأ عدّ جديد
  if (now - record.firstAttemptAt > WINDOW_MS) {
    record.attempts = 0;
    record.firstAttemptAt = now;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
  }
  attemptsMap.set(key, record);
}

/** تُستدعى بعد نجاح الدخول — تصفّر العداد */
function clearAttempts(username) {
  attemptsMap.delete((username || '').toLowerCase().trim());
}

module.exports = { checkLoginLock, recordFailedAttempt, clearAttempts };
