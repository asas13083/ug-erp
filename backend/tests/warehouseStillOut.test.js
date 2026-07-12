const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('لسه برا على مستوى المخزن — بيتتبع الحفلة مش بس نفس المخزن', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ============ بالظبط السيناريو اللي المستخدم لاحظه ============
  test('صرف من مخزن أ، ورجوع لمخزن تاني تماماً = مخزن أ لازم يشوف لسه برا = صفر', async () => {
    const warehouseC = await prisma.warehouse.create({ data: { name: 'مخزن جـ اختبار' } });

    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    let stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    let itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(10);

    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: warehouseC.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);

    stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(0);
  });

  test('صرف → نقل عهدة لحفلة تانية → رجوع من الحفلة التانية = المخزن الأصلي برضو يشوف صفر', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventB.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);

    const stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    const itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(0);
  });

  test('لو جزء من الصنف رجع فعلياً لمخزن والباقي لسه معلّق، المخزن الأصلي يفضل شايف الباقي بس', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // بنرجّع 6 بس فعلياً لمخزن (issuedQuantity هنا بتمثل حجم العملية دي بس، مش
    // إجمالي الصادر كله — فمفيش فاقد تلقائي، والـ4 الباقيين ببساطة لسه متلمسوش)
    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 6, returnedQuantity: 6, damagedQuantity: 0 }] })
      .expect(201);

    const stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    const itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(4);
  });

  // ============ بالظبط الباج اللي المستخدم لقاه دلوقتي ============
  test('نقل عهدة من غير أي رجوع لمخزن = المخزن الأصلي لازم يفضل شايف الكمية "لسه برا" بالكامل', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // مجرد نقل عهدة من حفلة لحفلة تانية — الصنف لسه في الحفلات، مادخلش أي
    // مخزن خالص، فمخزن أ المفروض يفضل شايفه "لسه برا" بالكامل
    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    const stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    const itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(10);
  });

  test('نقل عهدة من حفلة لحفلة لحفلة تالتة من غير رجوع = برضو لسه برا بالكامل', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventB.id, toEventId: fx.eventC.id, receiverName: 'أوبريشن جـ', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    const stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    const itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(10);
  });

  test('نقل عهدة ثم رجوع فعلي لمخزن = دلوقتي بس يبقى صفر', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventB.id, receiverName: 'أوبريشن ب', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    // لسه برا (اتنقلت بس مارجعتش)
    let stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    let itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(10);

    // دلوقتي ترجع فعلياً لمخزن من الحفلة التانية
    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventB.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);

    stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    itemRow = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(itemRow.stillOut).toBe(0);
  });
});
