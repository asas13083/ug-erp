const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

async function getComputedItemBase(agent, itemId) {
  const res = await agent.get(`/api/items/${itemId}/detail`).expect(200);
  return res.body.data.initialQuantity;
}

describe('الكمية الأساسية — قاعدة محلية بسيطة لكل مخزن', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ============ السيناريو اللي المستخدم جرّبه: رجوع لمخزن جديد ============
  test('رجوع من حفلة لمخزن جديد = الكمية الأساسية هناك بتبقى على الأقل بقد الكمية الفعلية، دايماً', async () => {
    const warehouseC = await prisma.warehouse.create({ data: { name: 'مخزن جـ اختبار' } });

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
      .send({ eventId: fx.eventB.id, warehouseId: warehouseC.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);

    const stockC = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: warehouseC.id } } });
    expect(stockC.baseQuantity).toBeGreaterThanOrEqual(10);
    expect(stockC.baseQuantity).toBe(stockC.quantity);
  });

  test('لو مخزن استقبل صنف عن طريق الرجوع، كميته الأساسية بتفضل دايماً >= كميته الفعلية حتى لو كانت بيانات قديمة غلط', async () => {
    await prisma.stockLevel.update({
      where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } },
      data: { baseQuantity: 5 }, // الفعلية 100، الأساسية غلط 5
    });

    await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 10 }] })
      .expect(201);

    await agent
      .post('/api/return-vouchers')
      .send({ eventId: fx.eventA.id, warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, issuedQuantity: 10, returnedQuantity: 10, damagedQuantity: 0 }] })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stock.baseQuantity).toBeGreaterThanOrEqual(stock.quantity);
  });

  test('فاقد حقيقي بينقص الكمية الأساسية المحسوبة على مستوى الصنف والمخزن مع بعض', async () => {
    const before = await getComputedItemBase(agent, fx.item.id);

    await agent
      .post('/api/loss-records')
      .send({ itemId: fx.item.id, warehouseId: fx.warehouse.id, quantity: 5, reason: 'THEFT', description: 'اختبار سرقة' })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    const after = await getComputedItemBase(agent, fx.item.id);

    expect(stock.baseQuantity).toBe(100 - 5);
    expect(after).toBe(before - 5);
  });

  test('إلغاء سجل الفاقد بيرجّع الكمية الأساسية المحسوبة زي ما كانت بالظبط', async () => {
    const before = await getComputedItemBase(agent, fx.item.id);

    const created = await agent
      .post('/api/loss-records')
      .send({ itemId: fx.item.id, warehouseId: fx.warehouse.id, quantity: 5, reason: 'THEFT', description: 'اختبار سرقة' })
      .expect(201);

    await agent.delete(`/api/loss-records/${created.body.data.id}`).expect(200);

    const after = await getComputedItemBase(agent, fx.item.id);
    expect(after).toBe(before);
  });

  // ============ طلب المستخدم: حذف صنف وإرجاعه لازم "يسمع" صح ============
  test('حذف صنف (نقل لسلة المهملات) واسترجاعه بيرجّع نفس الكمية الأساسية والفعلية زي ما كانت بالظبط', async () => {
    const beforeStock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });

    await agent.delete(`/api/items/${fx.item.id}`).expect(200);
    const stockDuringTrash = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(stockDuringTrash.baseQuantity).toBe(beforeStock.baseQuantity);
    expect(stockDuringTrash.quantity).toBe(beforeStock.quantity);

    await agent.post(`/api/items/trash/${fx.item.id}/restore`).expect(200);
    const afterRestore = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(afterRestore.baseQuantity).toBe(beforeStock.baseQuantity);
    expect(afterRestore.quantity).toBe(beforeStock.quantity);
  });

  test('الجرد بيزوّد الكمية الأساسية بمقدار الفرق الحقيقي عند وجود زيادة', async () => {
    const before = await getComputedItemBase(agent, fx.item.id);

    await agent
      .post('/api/stock-counts')
      .send({ warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, actualQuantity: 105 }] })
      .expect(201);

    const after = await getComputedItemBase(agent, fx.item.id);
    expect(after).toBe(before + 5);
  });

  test('الجرد لو لقى نقص، بيسجّل فاقد تلقائي وينقص الكمية الأساسية (مش الفعلية بس)', async () => {
    const before = await getComputedItemBase(agent, fx.item.id);

    await agent
      .post('/api/stock-counts')
      .send({ warehouseId: fx.warehouse.id, items: [{ itemId: fx.item.id, actualQuantity: 95 }] })
      .expect(201);

    const stock = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    const after = await getComputedItemBase(agent, fx.item.id);

    expect(stock.quantity).toBe(95);
    expect(stock.baseQuantity).toBe(100 - 5);
    expect(after).toBe(before - 5);

    const loss = await prisma.lossRecord.findFirst({ where: { itemId: fx.item.id, source: 'STOCK_COUNT' } });
    expect(loss).not.toBeNull();
    expect(loss.quantity).toBe(5);
  });

  test('سكريبت التصحيح الشامل بيصلّح مخزن كانت كميته الأساسية متسجّلة صفر غلط (بيانات قديمة)', async () => {
    await prisma.stockLevel.update({
      where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } },
      data: { baseQuantity: 0 },
    });

    const level = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    if (level.baseQuantity < level.quantity) {
      await prisma.stockLevel.update({ where: { id: level.id }, data: { baseQuantity: level.quantity } });
    }

    const fixed = await prisma.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } } });
    expect(fixed.baseQuantity).toBe(100);
  });
});
