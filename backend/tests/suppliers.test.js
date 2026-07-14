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
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'إيجار كراسي', count: 10, unitPrice: 50, paidAmount: 0 })
      .expect(201);

    expect(res.body.data.total).toBe(500);
    expect(res.body.data.paidAmount).toBe(0);
  });

  test('فاتورة مورد بتدخل في الإجمالي الكلي للحفلة', async () => {
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'تصوير', count: 1, unitPrice: 3000, paidAmount: 1000 })
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
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'تصوير', count: 1, unitPrice: 1000, paidAmount: 1500 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('المدفوع');
  });

  test('تعديل فاتورة بيحدّث الإجمالي صح', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', count: 5, unitPrice: 100, paidAmount: 0 })
      .expect(201);

    const updated = await agent
      .put(`/api/event-costs/suppliers/${created.body.data.id}`)
      .send({ count: 10, unitPrice: 100 })
      .expect(200);

    expect(updated.body.data.total).toBe(1000);
  });

  test('حذف فاتورة بيشيلها من إجمالي الحفلة', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', count: 5, unitPrice: 100 })
      .expect(201);

    await agent.delete(`/api/event-costs/suppliers/${created.body.data.id}`).expect(200);

    const summary = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary.body.data.suppliersTotal).toBe(0);
  });

  test('ملف المورد بيحسب المستحق صح (فواتير - مدفوع مع الفواتير - دفعات لاحقة)', async () => {
    // فاتورتين: واحدة 1000 مدفوع منها 200، والتانية 500 آجل بالكامل
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', count: 1, unitPrice: 1000, paidAmount: 200 })
      .expect(201);
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/suppliers`)
      .send({ supplierId: supplier.id, date: '2026-07-16', description: 'إضاءة', count: 1, unitPrice: 500, paidAmount: 0 })
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
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', count: 1, unitPrice: 800, paidAmount: 300 })
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
      .send({ supplierId: supplier.id, date: '2026-07-15', description: 'كراسي', count: 1, unitPrice: 1000 })
      .expect(201);

    const payment = await agent.post(`/api/suppliers/${supplier.id}/payments`).send({ amount: 400, date: '2026-07-16' }).expect(201);

    let profile = await agent.get(`/api/suppliers/${supplier.id}/profile`).expect(200);
    expect(profile.body.data.due).toBe(600);

    await agent.delete(`/api/suppliers/payments/${payment.body.data.id}`).expect(200);

    profile = await agent.get(`/api/suppliers/${supplier.id}/profile`).expect(200);
    expect(profile.body.data.due).toBe(1000);
  });
});
