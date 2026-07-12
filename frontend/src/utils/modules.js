// كل قسم في البرنامج له مفتاح ثابت (يُستخدم في الكود) واسم عربي (يظهر للمستخدم)
// أي قسم جديد يُضاف للبرنامج مستقبلاً، يُضاف هنا سطر واحد بس ويبقى متحكم في صلاحياته
const MODULES = [
  { key: 'items', label: 'الأصناف' },
  { key: 'categories', label: 'التصنيفات' },
  { key: 'warehouses', label: 'المخازن' },
  { key: 'clients', label: 'العملاء' },
  { key: 'suppliers', label: 'الموردين' },
  { key: 'events', label: 'الحفلات' },
  { key: 'issueVouchers', label: 'إذن الصرف' },
  { key: 'returnVouchers', label: 'إذن المرتجع' },
  { key: 'custodyTransfers', label: 'نقل العهدة بين الحفلات' },
  { key: 'lossRecords', label: 'الفاقد' },
  { key: 'damagedItems', label: 'التالف' },
  { key: 'reports', label: 'التقارير' },
  { key: 'activityLog', label: 'سجل الحركة' },
  { key: 'emailNotifications', label: 'إشعارات الإيميل' },
  { key: 'users', label: 'المستخدمون والصلاحيات' },
  { key: 'settings', label: 'إعدادات النظام' },
];

const MODULE_KEYS = MODULES.map((m) => m.key);

module.exports = { MODULES, MODULE_KEYS };
