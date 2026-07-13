const { AppError } = require('./errors');

// ترجمة أسماء الحقول الشائعة لكلمة عربية مفهومة — لو الحقل مش موجود هنا،
// بيتقال زي ما هو (بدل ما نضطر نترجم كل حقل في كل الشاشات يدوياً)
const FIELD_LABELS = {
  username: 'اسم المستخدم',
  password: 'كلمة السر',
  currentPassword: 'كلمة السر الحالية',
  newPassword: 'كلمة السر الجديدة',
  fullName: 'الاسم',
  roleId: 'الدور',
  phone: 'رقم الهاتف',
  warehouseId: 'المخزن',
  eventId: 'الحفلة',
  fromEventId: 'الحفلة المصدر',
  toEventId: 'الحفلة المستقبِلة',
  recipientName: 'اسم المستلم',
  receiverName: 'اسم المستلم',
  items: 'الأصناف',
  itemId: 'الصنف',
  quantity: 'الكمية',
  issuedQuantity: 'الكمية الصادرة',
  returnedQuantity: 'الكمية المرتجعة',
  damagedQuantity: 'الكمية التالفة',
  notes: 'الملاحظات',
};

function arabicFieldLabel(path) {
  const lastKey = path[path.length - 1];
  return FIELD_LABELS[lastKey] || lastKey || 'الحقل';
}

/**
 * middleware عام بيتحقق من جسم الطلب (body) على أي schema من zod، ويرجّع
 * رسالة خطأ عربية واضحة (اسم الحقل + المشكلة) لو فيه أي خطأ، بدل ما نسيب
 * كل كنترولر يكتب تحققاته يدوياً بشكل متكرر ومختلف من مكان لمكان.
 *
 * استخدام: router.post('/', validateBody(loginSchema), ctrl.login)
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const fieldName = arabicFieldLabel(firstIssue.path);
      // رسائل zod الافتراضية (زي "Required") بتبقى إنجليزي لو مكتبناش رسالة
      // مخصصة في الـschema نفسه — بنستبدلها بجملة عربية عامة واضحة
      const message = /^(Required|Invalid input.*)$/i.test(firstIssue.message) ? 'مطلوب' : firstIssue.message;
      return next(new AppError(`${fieldName}: ${message}`, 400));
    }
    // نستبدل req.body بالنسخة "المنضّفة" (converted/trimmed) اللي zod رجّعها
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
