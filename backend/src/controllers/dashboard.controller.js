const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs');
const path = require('path');
const { getEventScope, buildActivityLogScope } = require('../utils/eventScope');

/**
 * بيجيب كل صلاحيات "العرض" الخاصة بدور المستخدم دفعة واحدة، عشان لوحة
 * التحكم تقدر تخفي أي قسم مالوش صلاحية عليه — قبل كده كانت لوحة التحكم
 * بتوري كل الأرقام لأي مستخدم مسجّل دخول، بغض النظر عن صلاحياته الفعلية.
 */
async function getViewableModules(roleId) {
  const permissions = await prisma.permission.findMany({ where: { roleId, canView: true }, select: { module: true } });
  return new Set(permissions.map((p) => p.module));
}

const getStats = asyncHandler(async (req, res) => {
  const can = await getViewableModules(req.user.roleId);
  const scope = await getEventScope(req.user.id);
  const eventScopeFilter = scope ? { id: { in: scope } } : {};
  const activityScopeFilter = await buildActivityLogScope(req.user.id);

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    itemsCount,
    warehousesCount,
    openEventsCount,
    closedEventsCount,
    recentLogs,
    allStock,
    upcomingEvents,
    issuedTodayCount,
    returnedTodayCount,
    custodyTodayCount,
    lossTodayCount,
    allOpenEvents,
    emailQueue,
    topIssuedItemsRaw,
    activeUsersRaw,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.warehouse.count({ where: { deletedAt: null } }),
    prisma.event.count({ where: { status: { in: ['PLANNED', 'ONGOING'] }, ...eventScopeFilter } }),
    prisma.event.count({ where: { status: 'CLOSED', ...eventScopeFilter } }),
    prisma.activityLog.findMany({ where: activityScopeFilter || {}, orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { fullName: true } } } }),
    prisma.item.findMany({
      where: { isActive: true },
      include: { stockLevels: { where: { warehouse: { deletedAt: null } }, include: { warehouse: { select: { name: true } } } } },
    }),
    prisma.event.findMany({
      where: { status: { in: ['PLANNED', 'ONGOING'] }, startDate: { gte: todayStart }, ...eventScopeFilter },
      include: { client: true },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.issueVoucher.count({ where: { createdAt: { gte: todayStart }, status: 'CONFIRMED' } }),
    prisma.returnVoucher.count({ where: { createdAt: { gte: todayStart }, status: 'CONFIRMED' } }),
    prisma.custodyTransfer.count({ where: { createdAt: { gte: todayStart }, status: 'CONFIRMED' } }),
    prisma.lossRecord.count({ where: { createdAt: { gte: todayStart }, status: 'CONFIRMED' } }),
    prisma.event.findMany({ where: { status: { in: ['PLANNED', 'ONGOING'] }, ...eventScopeFilter }, select: { id: true } }),
    prisma.emailQueue.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.issueVoucherItem.findMany({
      where: { voucher: { createdAt: { gte: monthStart }, status: 'CONFIRMED' } },
      select: { itemId: true, quantity: true, item: { select: { name: true } } },
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { userId: true, user: { select: { fullName: true } } },
    }),
  ]);

  // ============ الأصناف اللي وصلت أو قربت من الحد الأدنى — الحد الأدنى بقى
  // خاص بكل مخزن على حدة، مش رقم واحد للصنف ككل ============
  const lowStockItems = [];
  allStock.forEach((item) => {
    item.stockLevels.forEach((s) => {
      if (s.minQuantity > 0 && s.quantity <= s.minQuantity) {
        lowStockItems.push({
          id: item.id,
          code: item.code,
          name: item.name,
          warehouseId: s.warehouseId,
          warehouseName: s.warehouse?.name || '—',
          totalQuantity: s.quantity,
          minQuantity: s.minQuantity,
        });
      }
    });
  });
  lowStockItems.sort((a, b) => a.totalQuantity - b.totalQuantity);

  // ============ حالة تسوية الحفلات المفتوحة (اتقفلت / لسه معلّقة / لسه معملهاش صرف) ============
  const { computeBulkSettlementStatuses } = require('../services/eventSettlement');
  const settlementMap = await computeBulkSettlementStatuses(allOpenEvents.map((e) => e.id));
  const settlementOverview = { settled: 0, pending: 0, none: 0 };
  settlementMap.forEach((status) => { settlementOverview[status] = (settlementOverview[status] || 0) + 1; });

  // ============ حالة طابور الإيميل ============
  const pendingEmails = emailQueue.filter((m) => m.status === 'PENDING').length;
  const failedEmails = emailQueue.filter((m) => m.status === 'FAILED').length;
  const lastSentEmail = emailQueue.find((m) => m.status === 'SENT');

  // ============ حالة آخر نسخة احتياطية ============
  let lastBackupAt = null;
  try {
    const backupsDir = path.join(__dirname, '../../backups');
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.sql'));
    if (files.length > 0) {
      const stats = files.map((f) => fs.statSync(path.join(backupsDir, f)));
      lastBackupAt = new Date(Math.max(...stats.map((s) => s.mtimeMs)));
    }
  } catch (err) {
    lastBackupAt = null;
  }

  // ============ أكتر 5 أصناف اتصرفوا الشهر ده ============
  const issuedByItem = new Map();
  topIssuedItemsRaw.forEach((l) => {
    const row = issuedByItem.get(l.itemId) || { name: l.item.name, quantity: 0 };
    row.quantity += l.quantity;
    issuedByItem.set(l.itemId, row);
  });
  const topIssuedItems = Array.from(issuedByItem.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  // ============ أكتر 5 مستخدمين نشاطاً الشهر ده ============
  const activityByUser = new Map();
  activeUsersRaw.forEach((l) => {
    const row = activityByUser.get(l.userId) || { name: l.user?.fullName || '—', count: 0 };
    row.count += 1;
    activityByUser.set(l.userId, row);
  });
  const mostActiveUsers = Array.from(activityByUser.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  res.json({
    success: true,
    data: {
      itemsCount: can.has('items') ? itemsCount : null,
      warehousesCount: can.has('warehouses') ? warehousesCount : null,
      openEventsCount: can.has('events') ? openEventsCount : null,
      closedEventsCount: can.has('events') ? closedEventsCount : null,
      lowStockAlertsCount: can.has('items') || can.has('warehouses') ? lowStockItems.length : null,
      lowStockItems: can.has('items') || can.has('warehouses') ? lowStockItems.slice(0, 10) : [],
      recentActivity: can.has('activityLog') ? recentLogs : [],
      upcomingEvents: can.has('events') ? upcomingEvents : [],
      todayStats: {
        issued: can.has('issueVouchers') ? issuedTodayCount : null,
        returned: can.has('returnVouchers') ? returnedTodayCount : null,
        custody: can.has('custodyTransfers') ? custodyTodayCount : null,
        loss: can.has('lossRecords') ? lossTodayCount : null,
      },
      settlementOverview: can.has('events') ? settlementOverview : [],
      emailStatus: can.has('emailNotifications')
        ? { pending: pendingEmails, failed: failedEmails, lastSentAt: lastSentEmail?.sentAt || null }
        : null,
      lastBackupAt: can.has('settings') ? lastBackupAt : null,
      topIssuedItems: can.has('items') ? topIssuedItems : [],
      mostActiveUsers: can.has('users') ? mostActiveUsers : [],
    },
  });
});

module.exports = { getStats };

/**
 * إحصائية شهرية: كمية الصرف والمرتجع والفاقد في كل شهر من آخر 6 شهور.
 * تُستخدم لرسم بياني في لوحة التحكم.
 */
const getMonthlyStats = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    where: { roleId: req.user.roleId, module: { in: ['issueVouchers', 'returnVouchers', 'lossRecords'] }, canView: true },
  });
  if (permissions.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('ar-EG', { month: 'long' }) });
  }
  const rangeStart = new Date(months[0].year, months[0].month, 1);

  const [issueItems, returnItems, lossItems] = await Promise.all([
    prisma.issueVoucherItem.findMany({ where: { voucher: { createdAt: { gte: rangeStart } } }, include: { voucher: true } }),
    prisma.returnVoucherItem.findMany({ where: { voucher: { createdAt: { gte: rangeStart } } }, include: { voucher: true } }),
    prisma.lossRecord.findMany({ where: { createdAt: { gte: rangeStart } } }),
  ]);

  const result = months.map(({ year, month, label }) => {
    const issued = issueItems
      .filter((i) => i.voucher.createdAt.getFullYear() === year && i.voucher.createdAt.getMonth() === month)
      .reduce((s, i) => s + i.quantity, 0);
    const returned = returnItems
      .filter((i) => i.voucher.createdAt.getFullYear() === year && i.voucher.createdAt.getMonth() === month)
      .reduce((s, i) => s + i.returnedQuantity + i.damagedQuantity, 0);
    const lost = lossItems
      .filter((l) => l.createdAt.getFullYear() === year && l.createdAt.getMonth() === month)
      .reduce((s, l) => s + l.quantity, 0);
    return { label, issued, returned, lost };
  });

  res.json({ success: true, data: result });
});

module.exports.getMonthlyStats = getMonthlyStats;
