const prisma = require('../lib/prisma');

/**
 * بتضمن إن الكمية الأساسية لمخزن معين متكونش أقل من كميته الفعلية —
 * قاعدة محلية بسيطة، مش محتاجة "تسحب" من مخازن تانية خالص (وده كان سبب
 * التعقيد والمشاكل المتكررة: لو المخزن التاني اللي هتسحب منه عنده مشكلة
 * قديمة برضو، كنت بتاخد "اللي لاقيته" بس مش الرقم الصح).
 *
 * القاعدة: أي مخزن استقبل صنف (رجوع من حفلة مثلاً)، كميته الأساسية لازم
 * تبقى على الأقل بقد كميته الفعلية. بسيطة ومضمونة تطلع صح كل مرة.
 */
async function ensureBaseQuantityAtLeast(tx, itemId, warehouseId, minAmount) {
  const level = await tx.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId, warehouseId } } });
  const currentBase = level?.baseQuantity || 0;
  if (currentBase >= minAmount) return; // أصلاً مظبوطة، مفيش داعي نلمسها

  await tx.stockLevel.upsert({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    update: { baseQuantity: minAmount },
    create: { itemId, warehouseId, quantity: 0, baseQuantity: minAmount },
  });
}

/**
 * بتنقص الكمية الأساسية (على مستوى المخزن) بسبب فاقد حقيقي — سرقة أو تلف
 * دائم معناه الشركة عندها كمية أقل للأبد، مش مؤقتاً بس.
 */
async function decreaseBaseQuantityForLoss(tx, itemId, warehouseId, quantity) {
  if (!warehouseId || quantity <= 0) return 0;

  const level = await tx.stockLevel.findUnique({ where: { itemId_warehouseId: { itemId, warehouseId } } });
  const decreaseAmount = Math.min(quantity, level?.baseQuantity || 0);
  if (decreaseAmount <= 0) return 0;

  await tx.stockLevel.update({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    data: { baseQuantity: { decrement: decreaseAmount } },
  });
  return decreaseAmount;
}

/** عكس أثر decreaseBaseQuantityForLoss بالظبط — لما تلغي أو تعدّل سجل فاقد */
async function increaseBaseQuantityForLossReversal(tx, itemId, warehouseId, quantity) {
  if (!warehouseId || quantity <= 0) return;
  await tx.stockLevel.update({
    where: { itemId_warehouseId: { itemId, warehouseId } },
    data: { baseQuantity: { increment: quantity } },
  });
}

module.exports = { ensureBaseQuantityAtLeast, decreaseBaseQuantityForLoss, increaseBaseQuantityForLossReversal };
