const prisma = require('../src/lib/prisma');
const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');

describe('قسم الموردين', () => {
  let agent, fx, supplier;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
    supplier = await prisma.supplier.create({ data: { name: 'مورد تجريبي', phone: '01000000000' } });
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('إضافة فاتورة مورد بتحسب الإجمالي صح (عدد × سعر)', async () => {
    const res = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'إيجار كراسي', paidAmount: 0, lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 10, unitPrice: 50 }] })
      .expect(201);

    expect(res.body.data.total).toBe(500);
    expect(res.body.data.paidAmount).toBe(0);
  });

  test('فاتورة مورد بتدخل في الإجمالي الكلي للحفلة', async () => {
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'تصوير', paidAmount: 1000, lines: [{ itemName: 'تصوير فوتوغرافي', unit: 'خدمة', count: 1, unitPrice: 3000 }] })
      .expect(201);

    const summary = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary.body.data.suppliersTotal).toBe(3000);
    expect(summary.body.data.suppliersPaid).toBe(1000);
    expect(summary.body.data.suppliersDue).toBe(2000);
    expect(summary.body.data.grandTotal).toBe(3000);
  });

  test('المدفوع مينفعش يكون أكبر من إجمالي الفاتورة', async () => {
    const res = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'تصوير', paidAmount: 1500, lines: [{ itemName: 'تصوير', unit: 'خدمة', count: 1, unitPrice: 1000 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('المدفوع');
  });

  test('تعديل فاتورة بيحدّث الإجمالي صح', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', paidAmount: 0, lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 5, unitPrice: 100 }] })
      .expect(201);

    const updated = await agent
      .put(`/api/event-costs/suppliers/${created.body.data.id}`)
      .send({ lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 10, unitPrice: 100 }] })
      .expect(200);

    expect(updated.body.data.total).toBe(1000);
  });

  test('حذف فاتورة بيشيلها من إجمالي الحفلة', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 5, unitPrice: 100 }] })
      .expect(201);

    await agent.delete(`/api/event-costs/suppliers/${created.body.data.id}`).expect(200);

    const summary = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary.body.data.suppliersTotal).toBe(0);
  });

  test('ملف المورد بيحسب المستحق صح (فواتير - مدفوع مع الفواتير - دفعات لاحقة)', async () => {
    // فاتورتين: واحدة 1000 مدفوع منها 200، والتانية 500 آجل بالكامل
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', paidAmount: 200, lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 1, unitPrice: 1000 }] })
      .expect(201);
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-16', description: 'إضاءة', paidAmount: 0, lines: [{ itemName: 'كشاف', unit: 'قطعة', count: 1, unitPrice: 500 }] })
      .expect(201);

    // دفعة لاحقة 300
    await agent.post(`/api/suppliers/${supplier.id}/payments`).send({ amount: 300, date: '2026-07-17' }).expect(201);

    const profile = await agent.get(`/api/suppliers/${supplier.id}/profile`).expect(200);
    expect(profile.body.data.totalInvoiced).toBe(1500);
    expect(profile.body.data.totalPaid).toBe(500); // 200 مع الفاتورة + 300 دفعة لاحقة
    expect(profile.body.data.due).toBe(1000);
    expect(profile.body.data.events).toHaveLength(1); // كلهم على نفس الحفلة
  });

  test('قايمة الموردين بترجع المستحق لكل مورد', async () => {
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', paidAmount: 300, lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 1, unitPrice: 800 }] })
      .expect(201);

    const res = await agent.get('/api/suppliers/with-balances').expect(200);
    const row = res.body.data.find((s) => s.id === supplier.id);
    expect(row.totalInvoiced).toBe(800);
    expect(row.totalPaid).toBe(300);
    expect(row.due).toBe(500);
  });

  test('حذف دفعة بيرجّع المستحق زي ما كان', async () => {
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', lines: [{ itemName: 'كرسي', unit: 'قطعة', count: 1, unitPrice: 1000 }] })
      .expect(201);

    const payment = await agent.post(`/api/suppliers/${supplier.id}/payments`).send({ amount: 400, date: '2026-07-16' }).expect(201);

    let profile = await agent.get(`/api/suppliers/${supplier.id}/profile`).expect(200);
    expect(profile.body.data.due).toBe(600);

    await agent.delete(`/api/suppliers/payments/${payment.body.data.id}`).expect(200);

    profile = await agent.get(`/api/suppliers/${supplier.id}/profile`).expect(200);
    expect(profile.body.data.due).toBe(1000);
  });

  // ============ واردات المخزن ============

  test('واردات الموردين بترجع الأصناف من غير أي بيانات مالية', async () => {
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'توريد خشب', paidAmount: 500, lines: [{ itemName: 'خشب زان', unit: 'متر', count: 20, unitPrice: 100 }] })
      .expect(201);

    const res = await agent.get('/api/supplier-deliveries').expect(200);
    expect(res.body.data).toHaveLength(1);

    const line = res.body.data[0];
    expect(line.itemName).toBe('خشب زان');
    expect(line.count).toBe(20);
    expect(line.supplier.name).toBe('مورد تجريبي');
    expect(line.event.name).toBe(fx.eventA.name);

    // أهم تأكيد: مفيش أي بيانات مالية في الرد خالص
    expect(line.unitPrice).toBeUndefined();
    expect(line.total).toBeUndefined();
    expect(line.paidAmount).toBeUndefined();
  });

  test('إضافة وارد لصنف موجود بتزوّد كميته في المخزن', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'توريد', lines: [{ itemName: 'صنف وارد', unit: 'قطعة', count: 30, unitPrice: 10 }] })
      .expect(201);

    const lineId = created.body.data.lines[0].id;

    const before = await prisma.stockLevel.findUnique({
      where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } },
    });

    await agent
      .post(`/api/supplier-deliveries/${lineId}/add-to-warehouse`)
      .send({ warehouseId: fx.warehouse.id, itemId: fx.item.id })
      .expect(200);

    const after = await prisma.stockLevel.findUnique({
      where: { itemId_warehouseId: { itemId: fx.item.id, warehouseId: fx.warehouse.id } },
    });

    expect(after.quantity).toBe(before.quantity + 30);
  });

  test('إضافة وارد كصنف جديد بتعمل الصنف وتحط كميته', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'توريد خشب', lines: [{ itemName: 'خشب زان جديد', unit: 'متر', count: 50, unitPrice: 100 }] })
      .expect(201);

    const lineId = created.body.data.lines[0].id;

    await agent
      .post(`/api/supplier-deliveries/${lineId}/add-to-warehouse`)
      .send({ warehouseId: fx.warehouse.id, categoryId: fx.category.id, unit: 'متر' })
      .expect(200);

    const newItem = await prisma.item.findFirst({ where: { name: 'خشب زان جديد' } });
    expect(newItem).toBeTruthy();
    expect(newItem.unit).toBe('متر');

    const stock = await prisma.stockLevel.findUnique({
      where: { itemId_warehouseId: { itemId: newItem.id, warehouseId: fx.warehouse.id } },
    });
    expect(stock.quantity).toBe(50);
  });

  test('مينفعش تضيف نفس الوارد للمخزن مرتين', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'توريد', lines: [{ itemName: 'صنف', unit: 'قطعة', count: 10, unitPrice: 10 }] })
      .expect(201);

    const lineId = created.body.data.lines[0].id;

    await agent.post(`/api/supplier-deliveries/${lineId}/add-to-warehouse`).send({ warehouseId: fx.warehouse.id, itemId: fx.item.id }).expect(200);

    const second = await agent
      .post(`/api/supplier-deliveries/${lineId}/add-to-warehouse`)
      .send({ warehouseId: fx.warehouse.id, itemId: fx.item.id });

    expect(second.status).toBe(409);
  });

  test('مينفعش تحذف فاتورة فيها أصناف اتضافت للمخزن', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'توريد', lines: [{ itemName: 'صنف', unit: 'قطعة', count: 10, unitPrice: 10 }] })
      .expect(201);

    const lineId = created.body.data.lines[0].id;
    await agent.post(`/api/supplier-deliveries/${lineId}/add-to-warehouse`).send({ warehouseId: fx.warehouse.id, itemId: fx.item.id }).expect(200);

    const res = await agent.delete(`/api/event-costs/suppliers/${created.body.data.id}`);
    expect(res.status).toBe(409);
  });
});
