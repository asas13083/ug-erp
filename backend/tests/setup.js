// بيتحمّل قبل أي ملف اختبار — بيقرا بيانات قاعدة البيانات التجريبية (.env.test)
// عشان الاختبارات متلمسش قاعدة البيانات الحقيقية خالص تحت أي ظرف
require('dotenv').config({ path: require('path').join(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test')) {
  throw new Error(
    'DATABASE_URL مش شكلها قاعدة بيانات تجريبية (لازم يكون فيها "test" في الاسم) — وقفنا الاختبارات عشان منلمسش بياناتك الحقيقية غلط. راجع ملف .env.test'
  );
}

const prisma = require('../src/lib/prisma');

afterAll(async () => {
  await prisma.$disconnect();
});
