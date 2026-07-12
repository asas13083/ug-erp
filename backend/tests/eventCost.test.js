const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');
const prisma = require('../src/lib/prisma');

describe('قسم الحسابات — كشوفات تكاليف الحفلات', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('إضافة بند توتال بسيط وتعديله وحذفه', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/items`)
      .send({ label: 'إجمالي الأرضيات', amount: 5000, notes: 'ملاحظة' })
      .expect(201);
    expect(created.body.data.amount).toBe(5000);

    await agent.put(`/api/event-costs/items/${created.body.data.id}`).send({ amount: 6000 }).expect(200);

    const summary1 = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary1.body.data.itemsTotal).toBe(6000);

    await agent.delete(`/api/event-costs/items/${created.body.data.id}`).expect(200);
    const summary2 = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary2.body.data.itemsTotal).toBe(0);
  });

  test('إضافة حركة يومية متراكمة — الإجمالي بيتحسب تلقائي من العدد والسعر', async () => {
    const created = await agent
      .post(`/api/event-costs/${fx.eventA.id}/entries`)
      .send({ category: 'DECOR_LABOR', date: '2026-07-15', typeLabel: 'نجار', count: 3, unitPrice: 300 })
      .expect(201);
    expect(created.body.data.total).toBe(900);

    const summary = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    const decorLabor = summary.body.data.categoryTotals.find((c) => c.category === 'DECOR_LABOR');
    expect(decorLabor.total).toBe(900);
    expect(summary.body.data.grandTotal).toBe(900);
  });

  test('فلتر الغرض بيقصّر النتائج صح', async () => {
    const purpose1 = await agent.post('/api/event-purposes').send({ name: 'أرضيات اختبار' }).expect(201);
    const purpose2 = await agent.post('/api/event-purposes').send({ name: 'برودكشن اختبار' }).expect(201);

    await agent.post(`/api/event-costs/${fx.eventA.id}/entries`).send({ category: 'DECOR_LABOR', date: '2026-07-15', typeLabel: 'نجار', purposeId: purpose1.body.data.id, count: 2, unitPrice: 100 }).expect(201);
    await agent.post(`/api/event-costs/${fx.eventA.id}/entries`).send({ category: 'DECOR_LABOR', date: '2026-07-15', typeLabel: 'حداد', purposeId: purpose2.body.data.id, count: 1, unitPrice: 200 }).expect(201);

    const filtered = await agent.get(`/api/event-costs/${fx.eventA.id}/entries`).query({ category: 'DECOR_LABOR', purposeId: purpose1.body.data.id }).expect(200);
    expect(filtered.body.data.entries).toHaveLength(1);
    expect(filtered.body.data.total).toBe(200);
  });

  test('الميزانية المتوقعة بتتحسب صح مقابل المصروف الفعلي', async () => {
    await agent.put(`/api/events/${fx.eventA.id}`).send({ expectedBudget: 1000 }).expect(200);
    await agent.post(`/api/event-costs/${fx.eventA.id}/items`).send({ label: 'بند', amount: 700 }).expect(201);

    const summary = await agent.get(`/api/event-costs/${fx.eventA.id}/summary`).expect(200);
    expect(summary.body.data.expectedBudget).toBe(1000);
    expect(summary.body.data.budgetDiff).toBe(300);
  });

  test('نسخ كشف من حفلة سابقة بينسخ البنود والحركات صح', async () => {
    await agent.post(`/api/event-costs/${fx.eventA.id}/items`).send({ label: 'بند منسوخ', amount: 500 }).expect(201);
    await agent.post(`/api/event-costs/${fx.eventA.id}/entries`).send({ category: 'TRANSPORT', date: '2026-07-15', typeLabel: 'ربع نقل', count: 1, unitPrice: 400 }).expect(201);

    const res = await agent.post(`/api/event-costs/${fx.eventB.id}/copy-from/${fx.eventA.id}`).expect(200);
    expect(res.body.message).toContain('1 بند و 1 حركة');

    const summaryB = await agent.get(`/api/event-costs/${fx.eventB.id}/summary`).expect(200);
    expect(summaryB.body.data.grandTotal).toBe(900);
  });

  // ============ استيراد سيارات النقل تلقائياً من الأذون ============
  test('اقتراحات النقل بتقرأ السيارات المسجّلة في إذن الصرف، ومتفضلش تظهر بعد الاستيراد', async () => {
    await agent
      .post('/api/issue-vouchers')
      .send({
        warehouseId: fx.warehouse.id,
        eventId: fx.eventA.id,
        recipientName: 'فني',
        vehicles: ['عربية كبيرة', 'ربع نقل'],
        items: [{ itemId: fx.item.id, quantity: 5 }],
      })
      .expect(201);

    const suggestionsBefore = await agent.get(`/api/event-costs/${fx.eventA.id}/transport-suggestions`).expect(200);
    expect(suggestionsBefore.body.data).toHaveLength(2);

    const first = suggestionsBefore.body.data[0];
    await agent
      .post(`/api/event-costs/${fx.eventA.id}/entries`)
      .send({
        category: 'TRANSPORT',
        date: first.date,
        typeLabel: first.typeLabel,
        count: 1,
        unitPrice: 350,
        sourceType: first.sourceType,
        sourceId: first.sourceId,
        sourceVehicleIndex: first.sourceVehicleIndex,
      })
      .expect(201);

    const suggestionsAfter = await agent.get(`/api/event-costs/${fx.eventA.id}/transport-suggestions`).expect(200);
    expect(suggestionsAfter.body.data).toHaveLength(1);
  });

  test('قايمة الحفلات بالإجمالي وعدد أيام العمالة بترجع أرقام صح', async () => {
    await agent.post(`/api/event-costs/${fx.eventA.id}/entries`).send({ category: 'DECOR_LABOR', date: '2026-07-15', typeLabel: 'نجار', count: 2, unitPrice: 100 }).expect(201);
    await agent.post(`/api/event-costs/${fx.eventA.id}/entries`).send({ category: 'DECOR_LABOR', date: '2026-07-16', typeLabel: 'نجار', count: 2, unitPrice: 100 }).expect(201);

    const res = await agent.get('/api/event-costs/events-list').query({ q: fx.eventA.name }).expect(200);
    const row = res.body.data.find((e) => e.id === fx.eventA.id);
    expect(row.costsTotal).toBe(400);
    expect(row.laborDaysCount).toBe(2);
  });
});
