const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('../utils/errors');

// يتأكد إن الطلب فيه توكن دخول صحيح (المستخدم مسجل دخول فعلاً)
// التوكن بيتقرا من كوكيز httpOnly (آمن ضد XSS — الكود مش بيقدر يقراه أصلاً)
function requireAuth(req, res, next) {
  const cookieToken = req.cookies?.ug_erp_token;
  const header = req.headers.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = cookieToken || headerToken;

  if (!token) {
    return next(new AppError('يجب تسجيل الدخول أولاً', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, fullName, roleId, roleName }
    next();
  } catch (err) {
    return next(new AppError('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', 401));
  }
}

const ACTION_FIELD = { view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete' };

/**
 * يتأكد إن دور المستخدم عنده صلاحية الإجراء المطلوب على القسم المطلوب.
 * استخدام: requirePermission('items', 'delete')
 * الصلاحيات بتتفحص لايف من قاعدة البيانات، فأي تغيير في صلاحيات الدور
 * يطبّق فوراً على كل المستخدمين اللي عندهم نفس الدور من غير ما يسجلوا خروج ودخول.
 */
function requirePermission(module, action) {
  const field = ACTION_FIELD[action];
  return async (req, res, next) => {
    if (!req.user) return next(new AppError('يجب تسجيل الدخول أولاً', 401));
    try {
      const permission = await prisma.permission.findUnique({
        where: { roleId_module: { roleId: req.user.roleId, module } },
      });
      if (!permission || !permission[field]) {
        return next(new AppError('ليس لديك صلاحية للقيام بهذا الإجراء', 403));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth, requirePermission };
