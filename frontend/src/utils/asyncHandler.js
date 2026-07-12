// بدل ما نكتب try/catch في كل controller، بنغلفه بالدالة دي
// وأي خطأ بيتبعت تلقائياً لـ errorHandler المركزي
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
