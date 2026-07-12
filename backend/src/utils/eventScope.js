const prisma = require('../lib/prisma');

/**
 * يرجّع null لو المستخدم مش مقيّد (يشوف كل الحفلات عادي)، أو Array بأرقام
 * الحفلات (eventIds) اللي هو معيّن عليها بس لو مفعّل عليه القيد.
 * بيتفحص لايف من قاعدة البيانات (زي نظام الصلاحيات بالظبط) عشان أي تغيير
 * في الإعداد ده يطبّق فوراً بدون تسجيل خروج ودخول.
 */
async function getEventScope(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { restrictToAssignedEvents: true } });
  if (!user || !user.restrictToAssignedEvents) return null;

  const assignments = await prisma.eventAssignment.findMany({ where: { userId }, select: { eventId: true } });
  return assignments.map((a) => a.eventId);
}

module.exports = { getEventScope };

/**
 * لسجل الحركة تحديداً: بيرجّع فلتر Prisma جاهز (أو null لو مش مقيّد) بيوري
 * للمستخدم المقيّد بس: عملياته الشخصية + أي عملية مرتبطة بحفلاته المعيّن
 * عليها (صرف/مرتجع/فاقد/نقل عهدة/الحفلة نفسها) — مش كل حركة النظام.
 */
async function buildActivityLogScope(userId) {
  const scope = await getEventScope(userId);
  if (!scope) return null;

  const [ivs, rvs, lrs, cts] = await Promise.all([
    prisma.issueVoucher.findMany({ where: { eventId: { in: scope } }, select: { id: true } }),
    prisma.returnVoucher.findMany({ where: { eventId: { in: scope } }, select: { id: true } }),
    prisma.lossRecord.findMany({ where: { eventId: { in: scope } }, select: { id: true } }),
    prisma.custodyTransfer.findMany({ where: { OR: [{ fromEventId: { in: scope } }, { toEventId: { in: scope } }] }, select: { id: true } }),
  ]);

  return {
    OR: [
      { userId },
      { entityType: 'Event', entityId: { in: scope } },
      { entityType: 'IssueVoucher', entityId: { in: ivs.map((x) => x.id) } },
      { entityType: 'ReturnVoucher', entityId: { in: rvs.map((x) => x.id) } },
      { entityType: 'LossRecord', entityId: { in: lrs.map((x) => x.id) } },
      { entityType: 'CustodyTransfer', entityId: { in: cts.map((x) => x.id) } },
    ],
  };
}

module.exports.buildActivityLogScope = buildActivityLogScope;
