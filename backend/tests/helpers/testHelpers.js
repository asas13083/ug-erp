const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const prisma = require('../../src/lib/prisma');
const { MODULE_KEYS } = require('../../src/utils/modules');

/** بيمسح كل جداول العمليات (مش المستخدمين والأدوار) عشان كل اختبار يبدأ من نقطة نضيفة */
async function cleanDatabase() {
  await prisma.custodyTransferItem.deleteMany();
  await prisma.custodyTransfer.deleteMany();
  await prisma.returnVoucherItem.deleteMany();
  await prisma.returnVoucher.deleteMany();
  await prisma.issueVoucherItem.deleteMany();
  await prisma.issueVoucher.deleteMany();
  await prisma.lossRecord.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.stockCountItem.deleteMany();
  await prisma.stockCount.deleteMany();
  await prisma.eventCostRecordEntry.deleteMany();
  await prisma.eventCostItem.deleteMany();
  await prisma.eventPurpose.deleteMany();
  await prisma.eventCostItemTemplate.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.eventAssignment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.item.deleteMany();
  await prisma.client.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.category.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

/** بيجهّز دور بكل الصلاحيات + مستخدم أدمن + Agent مسجّل دخول جاهز للاستخدام في الاختبارات */
async function createAuthenticatedAgent() {
  const role = await prisma.role.create({
    data: {
      name: 'Test Admin',
      isSystem: false,
      permissions: {
        create: MODULE_KEYS.map((key) => ({ module: key, canView: true, canCreate: true, canEdit: true, canDelete: true })),
      },
    },
  });

  const passwordHash = await bcrypt.hash('Test@12345', 10);
  const user = await prisma.user.create({
    data: { username: 'test.admin', fullName: 'Test Admin', passwordHash, roleId: role.id, isActive: true },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'test.admin', password: 'Test@12345' }).expect(200);

  return { agent, user, role };
}

/** بيجهّز مخزن وتصنيف وصنف بكمية أولية، وحفلتين — بيانات أساسية تُستخدم في أغلب اختبارات المخزون */
async function seedBaseInventory() {
  const category = await prisma.category.create({ data: { name: 'Test Category' } });
  const warehouse = await prisma.warehouse.create({ data: { name: 'Test Warehouse' } });
  const item = await prisma.item.create({
    data: { code: 'TST-0001', name: 'Test Item', categoryId: category.id, unit: 'قطعة', minQuantity: 0, initialQuantity: 100, initialWarehouseId: warehouse.id },
  });
  await prisma.stockLevel.create({ data: { itemId: item.id, warehouseId: warehouse.id, quantity: 100 } });

  const client = await prisma.client.create({ data: { name: 'Test Client' } });
  const eventA = await prisma.event.create({
    data: { number: 'EVT-TEST-A', name: 'Test Event A', clientId: client.id, startDate: new Date(), endDate: new Date(Date.now() + 86400000), status: 'ONGOING' },
  });
  const eventB = await prisma.event.create({
    data: { number: 'EVT-TEST-B', name: 'Test Event B', clientId: client.id, startDate: new Date(), endDate: new Date(Date.now() + 86400000), status: 'ONGOING' },
  });
  const eventC = await prisma.event.create({
    data: { number: 'EVT-TEST-C', name: 'Test Event C', clientId: client.id, startDate: new Date(), endDate: new Date(Date.now() + 86400000), status: 'ONGOING' },
  });

  return { category, warehouse, item, client, eventA, eventB, eventC };
}

module.exports = { cleanDatabase, createAuthenticatedAgent, seedBaseInventory };
