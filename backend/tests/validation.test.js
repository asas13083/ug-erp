const { cleanDatabase, createAuthenticatedAgent, seedBaseInventory } = require('./helpers/testHelpers');

describe('التحقق من صحة المدخلات (zod)', () => {
  let agent, fx;

  beforeEach(async () => {
    await cleanDatabase();
    ({ agent } = await createAuthenticatedAgent());
    fx = await seedBaseInventory();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  test('تسجيل الدخول برقم بدل كلمة سر بيترفض برسالة واضحة', async () => {
    const res = await agent.post('/api/auth/login').send({ username: 'admin', password: '' });
    expect(res.status).toBe(400);
  });

  test('إذن صرف بكمية سالبة أو صفر بيترفض قبل ما يوصل لمنطق المخزون', async () => {
    const res = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: -5 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('الكمية');
  });

  test('إذن صرف من غير حفلة بيترفض برسالة واضحة', async () => {
    const res = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('الحفلة');
  });

  test('إذن صرف من غير أصناف خالص بيترفض', async () => {
    const res = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [] });
    expect(res.status).toBe(400);
  });

  test('نقل عهدة لنفس الحفلة (من وإلى) بيترفض', async () => {
    const res = await agent
      .post('/api/custody-transfers')
      .send({ fromEventId: fx.eventA.id, toEventId: fx.eventA.id, receiverName: 'أوبريشن', items: [{ itemId: fx.item.id, quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('مختلفين');
  });

  test('إنشاء مستخدم بباسورد قصير جداً بيترفض', async () => {
    const res = await agent.post('/api/auth/users').send({ username: 'testuser1', password: '123', fullName: 'تجربة', roleId: 'x' });
    expect(res.status).toBe(400);
  });

  test('إذن صرف صحيح البيانات بيعدّي عادي (تأكيد إننا مش رافضين حاجة سليمة بالغلط)', async () => {
    const res = await agent
      .post('/api/issue-vouchers')
      .send({ warehouseId: fx.warehouse.id, eventId: fx.eventA.id, recipientName: 'فني', items: [{ itemId: fx.item.id, quantity: 5 }] });
    expect(res.status).toBe(201);
  });
});
