const { AppError } = require('./errors');

/**
 * يتأكد إن كل سطر أصناف فيه itemId فعلي وكمية رقم صحيح أكبر من صفر.
 * بيمنع أي قيمة سالبة أو صفر أو نص مش رقم يوصل لقاعدة البيانات ويكسر
 * حسابات المخزون بصمت (من غير أي رسالة خطأ واضحة للمستخدم).
 */
function assertValidQuantities(items, quantityField = 'quantity', { allowZero = false } = {}) {
  for (const line of items) {
    if (!line.itemId) {
      throw new AppError('كل سطر لازم يكون له صنف محدد', 400);
    }
    const qty = Number(line[quantityField]);
    const isValid = Number.isFinite(qty) && Number.isInteger(qty) && (allowZero ? qty >= 0 : qty > 0);
    if (!isValid) {
      throw new AppError(`الكمية لازم تكون رقم صحيح ${allowZero ? 'صفر أو أكبر' : 'أكبر من صفر'} (القيمة اللي اتبعتت: "${line[quantityField]}")`, 400);
    }
  }
}

module.exports = { assertValidQuantities };

/**
 * تحقق مخصص لسطور إذن المرتجع: كل الأرقام لازم تكون صحيحة وغير سالبة،
 * ومجموع (السليم + التالف) میتعدّاش الكمية المصروفة أصلاً — غير كده
 * الفرق (اللي هيتحول فاقد تلقائياً) هيبقى رقم سالب وهيكسر الحسابات.
 */
function assertValidReturnLines(items) {
  for (const line of items) {
    if (!line.itemId) throw new AppError('كل سطر لازم يكون له صنف محدد', 400);
    const issued = Number(line.issuedQuantity);
    const returned = Number(line.returnedQuantity);
    const damaged = Number(line.damagedQuantity || 0);
    const allNonNegativeInts = [issued, returned, damaged].every((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0);
    if (!allNonNegativeInts) {
      throw new AppError('كميات المرتجع لازم تكون أرقام صحيحة غير سالبة', 400);
    }
    if (issued <= 0) {
      throw new AppError('الكمية المصروفة لازم تكون أكبر من صفر', 400);
    }
    if (returned + damaged > issued) {
      throw new AppError(`مجموع السليم والتالف (${returned + damaged}) مينفعش يكون أكبر من الكمية المصروفة أصلاً (${issued})`, 400);
    }
  }
}

module.exports.assertValidReturnLines = assertValidReturnLines;
