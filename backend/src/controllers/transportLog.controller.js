const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateRangeFilter } = require('../utils/dateRangeFilter');
const { getEventScope } = require('../utils/eventScope');

/**
 * يجمع كل عمليات النقل (اللي اتسجل فيها عدد سيارات أو ملاحظة نقل) من الثلاثة
 * أنواع أذون مختلفة (صرف / مرتجع / نقل عهدة) في قايمة واحدة موحّدة، مرتبة بالتاريخ.
 */
async function fetchTransportLog(req) {
  const dateFilter = buildDateRangeFilter(req);
  const hasTransportData = { OR: [{ vehicleCount: { not: null } }, { transportInfo: { not: null } }] };
  const scope = await getEventScope(req.user.id);
  const eventScopeFilter = scope ? { eventId: { in: scope } } : {};
  const custodyScopeFilter = scope ? { OR: [{ fromEventId: { in: scope } }, { toEventId: { in: scope } }] } : {};

  const [issueVouchers, returnVouchers, custodyTransfers] = await Promise.all([
    prisma.issueVoucher.findMany({
      where: { ...hasTransportData, ...dateFilter, ...eventScopeFilter },
      include: { event: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.returnVoucher.findMany({
      where: { ...hasTransportData, ...dateFilter, ...eventScopeFilter },
      include: { event: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.custodyTransfer.findMany({
      where: { ...hasTransportData, ...dateFilter, ...custodyScopeFilter },
      include: { fromEvent: true, toEvent: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ]);

  const rows = [
    ...issueVouchers.map((v) => ({
      id: v.id,
      type: 'ISSUE',
      number: v.number,
      eventName: v.event?.name || '—',
      context: v.warehouse?.name || '—',
      responsible: v.recipientName,
      vehicleCount: v.vehicleCount,
      transportInfo: v.transportInfo,
      vehicles: v.vehicles,
      status: v.status,
      createdAt: v.createdAt,
    })),
    ...returnVouchers.map((v) => ({
      id: v.id,
      type: 'RETURN',
      number: v.number,
      eventName: v.event?.name || '—',
      context: v.warehouse?.name || '—',
      responsible: '—',
      vehicleCount: v.vehicleCount,
      transportInfo: v.transportInfo,
      vehicles: v.vehicles,
      status: v.status,
      createdAt: v.createdAt,
    })),
    ...custodyTransfers.map((t) => ({
      id: t.id,
      type: 'CUSTODY',
      number: t.number,
      eventName: `${t.fromEvent?.name || '—'} ← ${t.toEvent?.name || '—'}`,
      context: t.receiverName,
      responsible: t.receiverName,
      vehicleCount: t.vehicleCount,
      transportInfo: t.transportInfo,
      vehicles: t.vehicles,
      status: t.status,
      createdAt: t.createdAt,
    })),
  ];

  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}

// GET /api/transport-log?dateFrom=&dateTo=
const list = asyncHandler(async (req, res) => {
  const rows = await fetchTransportLog(req);
  res.json({ success: true, data: rows });
});

module.exports = { list, fetchTransportLog };
