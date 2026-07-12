const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('دمج الأصناف المكررة والحد الأدنى لكل مخزن', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('إضافة صنف بنفس الاسم والتصنيف لصنف موجود = دمج في الكمية بدل تكرار', async () => {
    const before = await prisma.item.count();

    const res = await agent
      .post('/api/items')
      .send({
        name: fx.item.name,
        categoryId: fx.category.id,
        unit: 'قطعة',
        initialWarehouseId: fx.warehouse.id,
        initialQuantity: 25,
      })
      .expect(200);

    expect(res.body.merged).toBe(true);

    const after = await prisma.item.count();
    expect(after).toBe(before);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.quantity).toBe(125);
  });

  test('إضافة صنف باسم مختلف أو تصنيف مختلف = صنف جديد فعلاً، مش دمج', async () => {
    const before = await prisma.item.count();

    await agent
      .post('/api/items')
      .send({ name: 'صنف مختلف تماماً', categoryId: fx.category.id, unit: 'قطعة', initialWarehouseId: fx.warehouse.id, initialQuantity: 10 })
      .expect(201);

    const after = await prisma.item.count();
    expect(after).toBe(before + 1);
  });

  test('تعديل الحد الأدنى لصنف في مخزن معين، وتنبيه النقص بيبان في نفس المخزن بس', async () => {
    await agent.put(`/api/warehouses/${fx.warehouse.id}/stock/${fx.item.id}/min-quantity`).send({ minQuantity: 90 }).expect(200);

    const stockRes = await agent.get(`/api/warehouses/${fx.warehouse.id}/stock`).expect(200);
    const row = stockRes.body.data.find((s) => s.itemId === fx.item.id);
    expect(row.minQuantity).toBe(90);
    expect(row.quantity).toBeGreaterThan(row.minQuantity);
  });

  test('نقص الكمية تحت الحد الأدنى في مخزن معين بيظهر في تنبيهات لوحة التحكم', async () => {
    await agent.put(`/api/warehouses/${fx.warehouse.id}/stock/${fx.item.id}/min-quantity`).send({ minQuantity: 90 }).expect(200);

    await agent.post('/api/loss-records').send({ itemId: fx.item.id, warehouseId: fx.warehouse.id, quantity: 15, reason: 'THEFT', description: 'اختبار' }).expect(201);

    const dashboardRes = await agent.get('/api/dashboard/stats').expect(200);
    const alert = dashboardRes.body.data.lowStockItems.find((i) => i.id === fx.item.id && i.warehouseId === fx.warehouse.id);
    expect(alert).toBeDefined();
    expect(alert.totalQuantity).toBe(85);
  });
});
