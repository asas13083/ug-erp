/**
 * سكريبت تصحيح شامل للكمية الأساسية — يتشغّل مرة واحدة بس بعد التحديث ده.
 *
 * ملحوظة مهمة بعد آخر تحديث: "الكمية الأساسية" على مستوى الصنف بقت رقم
 * محسوب حياً (مجموع الكمية الأساسية في كل مخازنه + لسه برا)، مش عمود
 * منفصل بنزامنه يدوياً — فمحتاجش نصلّحه هنا خالص، هيصلّح نفسه تلقائياً.
 *
 * اللي لسه محتاج تصحيح لمرة واحدة: أي مخزن كانت "الكمية الأساسية" بتاعته
 * متسجّلة صفر غلط (بيانات قديمة من قبل ما نضيف الميزة دي من الأساس). ده
 * السكريبت بيصلّحها بمقارنة كل مخزن على حدة بالكمية الفعلية الموجودة فيه.
 *
 * طريقة التشغيل (مرة واحدة بس، بعد ما تحدّث الكود):
 *   cd backend
 *   node scripts/backfillBaseQuantity.js
 */
const prisma = require('../src/lib/prisma');

async function main() {
  console.log('بدء التصحيح الشامل للكمية الأساسية في المخازن...\n');

  // أي رصيد مخزن عنده كمية فعلية أكبر من صفر بس كميته الأساسية متسجّلة صفر
  // (أو أقل من الفعلي بأي شكل غير منطقي) = بيانات قديمة محتاجة تصحيح
  const levels = await prisma.stockLevel.findMany({
    where: { quantity: { gt: 0 } },
    include: { item: true, warehouse: true },
  });

  let fixedCount = 0;
  for (const level of levels) {
    if (level.baseQuantity < level.quantity) {
      await prisma.stockLevel.update({ where: { id: level.id }, data: { baseQuantity: level.quantity } });
      console.log(`✓ ${level.item.name} في ${level.warehouse.name}: الكمية الأساسية اتصححت من ${level.baseQuantity} لـ ${level.quantity}`);
      fixedCount++;
    }
  }

  console.log(`\nخلص التصحيح. عدد أرصدة المخازن اللي اتصححت: ${fixedCount} من إجمالي ${levels.length}.`);
  console.log('الكمية الأساسية على مستوى الصنف مش محتاجة تصحيح — بتتحسب تلقائياً دلوقتي من المخازن.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('حصل خطأ أثناء التصحيح:', err);
  process.exit(1);
});
