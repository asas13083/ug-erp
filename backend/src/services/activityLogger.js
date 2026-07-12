const prisma = require('../lib/prisma');

/**
 * تسجّل أي عملية تحصل في النظام في سجل الحركة (ActivityLog) بس —
 * من غير ما تبعت إيميل لكل عملية صغيرة (ده بقى مسؤولية reportEmailService
 * اللي بيبعت تقرير يومي وشهري مجمّع بدل إشعار مزعج لكل حركة).
 */
async function logActivity({ action, entityType, entityId, description, userId, tx = prisma }) {
  return tx.activityLog.create({
    data: { action, entityType, entityId, description, userId },
  });
}

module.exports = { logActivity };
