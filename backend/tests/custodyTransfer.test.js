const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('نقل العهدة بين الحفلات', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory(); // فيها أصلاً eventA, eventB, eventC
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('النقل مبيلمسش المخزون خالص — بس بيغيّر مين مسؤول عن الصنف', async () => {
    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(90); // زي ما كان بعد الصرف بالظبط

    const eventARes = await agent.get(`/api/events/${fx.eventA.id}`).expect(200);
    const eventBRes = await agent.get(`/api/events/${fx.eventB.id}`).expect(200);
    const pendingA = eventARes.body.data.itemsSummary.find((s) => s.itemId === fx.item.id)?.pending || 0;
    const pendingB = eventBRes.body.data.itemsSummary.find((s) => s.itemId === fx.item.id)?.pending || 0;
    expect(pendingA).toBe(0); // حفلة أ خلصت مسؤوليتها
    expect(pendingB).toBe(10); // حفلة ب بقت مسؤولة عن الـ10
  });

  // ============ ده بالظبط الباج اللي اكتشفناه واتصلح ============
  test('مينفعش تلغي نقل عهدة تاني لو الحفلة الهدف نقلته تالت مرة', async () => {
    const firstTransfer = await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // حفلة ب بتنقل نفس الـ10 قطع لحفلة جـ
    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventB.id, toEventId: fx.eventC.id, receiverName: 'أوبريشن جـ', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // لو حاولنا نلغي أول نقل (أ→ب)، لازم يترفض
    const res = await agent.delete(`/api/custody-transfers/${firstTransfer.body.data.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('نقلت أو رجّعت الصنف بعد كده');
  });

  test('التوفر بيتفحص من الحفلة المصدر — مينفعش تنقل أكتر من اللي لسه برا فعلاً', async () => {
    const res = await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 999 }] });
    expect(res.status).toBe(400);
  });
});
