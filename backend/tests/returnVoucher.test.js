const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('إذن المرتجع', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
    // كل اختبارات المرتجع محتاجة إذن صرف موجود الأول عشان نقدر نرجّع منه
    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني تجربة', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('الإنشاء بيرجّع الكمية السليمة للمخزن ويسجّل الفاقد التلقائي للباقي', async () => {
    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 7, damagedQuantity: 0 }] })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(97); // 100 - 10 (صرف) + 7 (رجع) = 97

    const loss = await prisma.lossRecord.findFirst({ where: { itemId: fx.item.id, source: 'RETURN_VOUCHER' } });
    expect(loss).not.toBeNull();
    expect(loss.quantity).toBe(3);
  });

  test('الإلغاء العادي بيعكس أثر المرتجع على المخزون', async () => {
    const created = await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 7, damagedQuantity: 0 }] })
      .expect(201);

    await agent.delete(`/api/return-vouchers/${created.body.data.id}`).expect(200);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(90);

    const loss = await prisma.lossRecord.findFirst({ where: { itemId: fx.item.id, source: 'RETURN_VOUCHER' } });
    expect(loss).toBeNull(); // الفاقد التلقائي المرتبط بيتشال مع الإلغاء
  });

  // ============ ده بالظبط الباج اللي اكتشفناه واتصلح ============
  test('مينفعش تلغي إذن مرتجع لو الكمية اللي رجعت اتصرفت تاني لحفلة تانية', async () => {
    const created = await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);
    // المخزن دلوقتي 100 تاني

    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventB.id, recipientName: 'فني تجربة ب', items: [{ itemId: fx.item.id, quantity: 100 }] })
      .expect(201);
    // المخزن دلوقتي صفر

    const res = await agent.delete(`/api/return-vouchers/${created.body.data.id}`);
    expect(res.status).toBe(409);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(0); // معملش أي تغيير غلط، ومفيش رصيد سالب
  });
});
