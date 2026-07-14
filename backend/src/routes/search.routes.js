const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { getEventScope } = require('../utils/eventScope');

router.use(requireAuth);

// GET /api/search?q=... — بحث سريع في الأصناف، الحفلات، العملاء، أذون الصرف والمرتجع
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: {} });

    const contains = { contains: q, mode: 'insensitive' };
    const scope = await getEventScope(req.user.id);
    const eventScopeFilter = scope ? { id: { in: scope } } : {};
    const voucherScopeFilter = scope ? { eventId: { in: scope } } : {};

    const [items, events, clients, suppliers, warehouses, issueVouchers, returnVouchers] = await Promise.all([
      prisma.item.findMany({ where: { isActive: true, OR: [{ name: contains }, { code: contains }] }, take: 5 }),
      prisma.event.findMany({ where: { OR: [{ name: contains }, { number: contains }, { location: contains }], ...eventScopeFilter }, take: 5 }),
      prisma.client.findMany({ where: { OR: [{ name: contains }, { company: contains }], deletedAt: null }, take: 5 }),
      prisma.supplier.findMany({ where: { OR: [{ name: contains }, { company: contains }], deletedAt: null }, take: 5 }),
      prisma.warehouse.findMany({ where: { name: contains, deletedAt: null }, take: 5 }),
      // البحث في الأذون برقم الإذن أو اسم الحفلة (مش رقم الإذن بس زي الأول)
      prisma.issueVoucher.findMany({
        where: { OR: [{ number: contains }, { event: { name: contains } }], ...voucherScopeFilter },
        include: { event: true },
        take: 5,
      }),
      prisma.returnVoucher.findMany({
        where: { OR: [{ number: contains }, { event: { name: contains } }], ...voucherScopeFilter },
        include: { event: true },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map((i) => ({ id: i.id, title: i.name, subtitle: i.code, link: `/items/${i.id}` })),
        events: events.map((e) => ({ id: e.id, title: e.name, subtitle: e.number, link: `/events/${e.id}` })),
        clients: clients.map((c) => ({ id: c.id, title: c.name, subtitle: c.company || '', link: `/clients/${c.id}` })),
        suppliers: suppliers.map((s) => ({ id: s.id, title: s.name, subtitle: s.company || '', link: '/suppliers' })),
        warehouses: warehouses.map((w) => ({ id: w.id, title: w.name, subtitle: '', link: `/warehouses/${w.id}` })),
        issueVouchers: issueVouchers.map((v) => ({ id: v.id, title: v.number, subtitle: v.event?.name || '', link: '/issue-vouchers-log' })),
        returnVouchers: returnVouchers.map((v) => ({ id: v.id, title: v.number, subtitle: v.event?.name || '', link: '/return-vouchers-log' })),
      },
    });
  })
);

module.exports = router;
