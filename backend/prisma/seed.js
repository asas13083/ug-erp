const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { MODULE_KEYS } = require('../src/utils/modules');
const prisma = new PrismaClient();

// صلاحيات كاملة (لكل الأقسام) — تُستخدم لدور "مدير النظام"
function fullPermissions() {
  return MODULE_KEYS.map((module) => ({ module, canView: true, canCreate: true, canEdit: true, canDelete: true }));
}

// صلاحيات مخصصة لدور معين، والباقي (أي قسم مش مذكور) بيبقى بدون أي صلاحية
function customPermissions(overrides) {
  return MODULE_KEYS.map((module) => ({
    module,
    canView: !!overrides[module]?.canView,
    canCreate: !!overrides[module]?.canCreate,
    canEdit: !!overrides[module]?.canEdit,
    canDelete: !!overrides[module]?.canDelete,
  }));
}

async function main() {
  console.log('⏳ جاري إنشاء البيانات الأولية...');

  // ============ الأدوار الأساسية ============
  const adminRole = await prisma.role.upsert({
    where: { name: 'مدير النظام' },
    update: {},
    create: { name: 'مدير النظام', isSystem: true, permissions: { create: fullPermissions() } },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'مدير' },
    update: {},
    create: {
      name: 'مدير',
      permissions: {
        create: customPermissions({
          items: { canView: true, canCreate: true, canEdit: true },
          categories: { canView: true, canCreate: true, canEdit: true },
          warehouses: { canView: true, canCreate: true, canEdit: true },
          clients: { canView: true, canCreate: true, canEdit: true },
          events: { canView: true, canCreate: true, canEdit: true },
          issueVouchers: { canView: true, canCreate: true },
          returnVouchers: { canView: true, canCreate: true },
          custodyTransfers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          lossRecords: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          damagedItems: { canView: true },
          reports: { canView: true },
          activityLog: { canView: true },
          emailNotifications: { canView: true, canCreate: true, canEdit: true },
        }),
      },
    },
  });

  const storeKeeperRole = await prisma.role.upsert({
    where: { name: 'أمين مخزن' },
    update: {},
    create: {
      name: 'أمين مخزن',
      permissions: {
        create: customPermissions({
          items: { canView: true, canCreate: true, canEdit: true },
          categories: { canView: true },
          warehouses: { canView: true },
          clients: { canView: true },
          events: { canView: true },
          issueVouchers: { canView: true, canCreate: true },
          returnVouchers: { canView: true, canCreate: true },
          custodyTransfers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          lossRecords: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          damagedItems: { canView: true },
          reports: { canView: true },
        }),
      },
    },
  });

  const operationRole = await prisma.role.upsert({
    where: { name: 'أوبريتور' },
    update: {},
    create: {
      name: 'أوبريتور',
      permissions: {
        create: customPermissions({
          items: { canView: true },
          warehouses: { canView: true },
          clients: { canView: true, canCreate: true },
          events: { canView: true, canCreate: true, canEdit: true },
          issueVouchers: { canView: true },
          returnVouchers: { canView: true },
          custodyTransfers: { canView: true },
          lossRecords: { canView: true },
          damagedItems: { canView: true },
        }),
      },
    },
  });

  console.log('✓ تم إنشاء 4 أدوار أساسية: مدير النظام، مدير، أمين مخزن، أوبريتور');

  // مزامنة: أي قسم جديد يتضاف للنظام مستقبلاً (زي "settings" للنسخ الاحتياطي)
  // يتضاف تلقائياً بصلاحية كاملة لدور "مدير النظام" حتى لو الدور كان موجود من قبل
  for (const module of MODULE_KEYS) {
    await prisma.permission.upsert({
      where: { roleId_module: { roleId: adminRole.id, module } },
      update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      create: { roleId: adminRole.id, module, canView: true, canCreate: true, canEdit: true, canDelete: true },
    });
  }

  // ============ حساب الأدمن الأول ============
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', fullName: 'مدير النظام', passwordHash: adminPassword, roleId: adminRole.id },
  });
  console.log('✓ تم إنشاء حساب الأدمن — يوزر: admin / باسورد: Admin@12345');
  console.log('  ⚠ غيّر الباسورد ده فوراً بعد أول تسجيل دخول');

  // ============ تصنيفات أساسية ============
  const categories = ['أرضيات', 'خشب', 'إضاءة', 'حديد', 'كابلات', 'ديكور', 'مسامير', 'إكسسوارات', 'مستهلكات', 'معدات'];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`✓ تم إنشاء ${categories.length} تصنيف أساسي`);

  // ============ مخزن رئيسي افتراضي ============
  await prisma.warehouse.upsert({
    where: { id: 'seed-warehouse-main' },
    update: {},
    create: { id: 'seed-warehouse-main', name: 'المخزن الرئيسي', location: 'المقر الرئيسي', responsible: 'مدير النظام' },
  });
  console.log('✓ تم إنشاء مخزن رئيسي افتراضي');

  console.log('\n✅ التهيئة الأولية اكتملت بنجاح.');
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء التهيئة:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
