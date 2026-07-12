const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('إذن الصرف', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('الإنشاء بيخصم الكمية من المخزن فوراً', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(90); // كان 100
  });

  test('الإلغاء العادي بيرجّع الكمية للمخزن', async () => {
    const created = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent.delete(`/api/issue-vouchers/${created.body.data.id}`).expect(200);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(100);
  });

  // ============ ده بالظبط الباج اللي اكتشفناه واتصلح ============
  test('مينفعش تلغي إذن صرف لو الصنف اتنقل عهدة لحفلة تانية بعده', async () => {
    const created = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // لازم يترفض — القطع دي بقت في حفلة ب مش المخزن، إرجاعها هيخلق كمية وهمية مكررة
    const res = await agent.delete(`/api/issue-vouchers/${created.body.data.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('اتحرّك بعد الإذن ده');

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(90); // معملش أي تغيير غلط
  });

  test('مينفعش تقلّل كمية إذن صرف لو جزء منها اتنقل عهدة', async () => {
    const created = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 6 }] })
      .expect(201);

    const res = await agent
      .put(`/api/issue-vouchers/${created.body.data.id}`)
      .send({ recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 2 }] });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('مينفعش تقلّل كمية صنف');
  });

  test('التوفر بيتفحص قبل الصرف — مينفعش تصرف أكتر من المتاح', async () => {
    const res = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 999 }] });
    expect(res.status).toBe(409);
  });
});
