class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// معالج الأخطاء المركزي — كل خطأ في النظام بيمر من هنا في النهاية
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err.message);

  // أخطاء Prisma الشائعة (كود مكرر، سجل غير موجود...)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `القيمة دي مستخدمة قبل كده (${err.meta?.target?.join(', ') || 'حقل فريد'})`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'السجل المطلوب غير موجود' });
  }
  if (err.code === 'P2003') {
    return res.status(409).json({ success: false, message: 'لا يمكن حذف هذا السجل لأنه مرتبط ببيانات أخرى' });
  }
  // تعارض معاملتين بيحصلوا في نفس اللحظة بالظبط (بعد استنفاد محاولات إعادة التنفيذ التلقائية)
  if (err.code === 'P2034') {
    return res.status(409).json({ success: false, message: 'في عملية تانية بتحصل على نفس البيانات في نفس اللحظة — من فضلك حاول تاني' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'حدث خطأ غير متوقع في السيرفر';

  res.status(statusCode).json({ success: false, message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `المسار غير موجود: ${req.originalUrl}` });
}

module.exports = { AppError, errorHandler, notFoundHandler };
