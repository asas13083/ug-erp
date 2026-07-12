const prisma = require('../lib/prisma');

/**
 * ينفّذ عملية قاعدة بيانات بمستوى عزل "Serializable" — أقصى درجة حماية
 * ممكنة ضد تعارض عمليتين بيحصلوا في نفس اللحظة بالظبط (زي اتنين مستخدمين
 * بيصرفوا نفس الصنف من نفس المخزن في نفس الثانية).
 *
 * من غير الحماية دي، ممكن الاتنين "يشوفوا" إن الكمية متاحة في نفس اللحظة
 * قبل ما أي حد يخصم فعلياً، فتنزل الكمية تحت الصفر من غير أي تحذير.
 *
 * لو قاعدة البيانات اكتشفت تعارض حقيقي، بترفض إحدى العمليتين تلقائياً،
 * والدالة دي بتعيد المحاولة لحد 3 مرات قبل ما ترجّع خطأ واضح للمستخدم
 * ("في عملية تانية بتحصل في نفس اللحظة، حاول تاني").
 */
async function runSerializable(fn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (err) {
      const isConflict = err.code === 'P2034' || /could not serialize|deadlock/i.test(err.message || '');
      if (isConflict && attempt < retries) continue;
      if (isConflict) {
        const { AppError } = require('./errors');
        throw new AppError('في عملية تانية بتحصل على نفس الصنف في نفس اللحظة — من فضلك حاول تاني', 409);
      }
      throw err;
    }
  }
}

module.exports = { runSerializable };
