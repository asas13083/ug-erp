const { PrismaClient } = require('@prisma/client');

// نسخة واحدة فقط من الاتصال بقاعدة البيانات تُستخدم في كل النظام
// (تجنّب فتح اتصالات متعددة بدون داعٍ)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

module.exports = prisma;
