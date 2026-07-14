-- ترحيل تصحيحي: النسخة السابقة من هذا القسم اتسجّلت "مطبّقة" على بعض
-- السيرفرات قبل ما نضيف بنود الفاتورة، فجدول البنود متعملش. الأوامر هنا
-- كلها "لو مش موجود" (IF NOT EXISTS) — آمنة تماماً تتنفذ حتى لو جزء منها
-- كان موجود بالفعل، ومش هتبوّظ أي بيانات حالية.

-- تأكيد وجود عمود الصورة
ALTER TABLE "event_supplier_entries" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- شيل الأعمدة القديمة (عدد/سعر على مستوى الفاتورة) لو لسه موجودة من نسخة قديمة
ALTER TABLE "event_supplier_entries" DROP COLUMN IF EXISTS "count";
ALTER TABLE "event_supplier_entries" DROP COLUMN IF EXISTS "unitPrice";

-- إنشاء جدول بنود الفاتورة لو مش موجود
CREATE TABLE IF NOT EXISTS "event_supplier_entry_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "count" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "addedToWarehouseId" TEXT,
    "addedAt" TIMESTAMP(3),
    "addedByUserId" TEXT,
    "createdItemId" TEXT,

    CONSTRAINT "event_supplier_entry_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "event_supplier_entry_lines_entryId_idx" ON "event_supplier_entry_lines"("entryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'event_supplier_entry_lines_entryId_fkey'
  ) THEN
    ALTER TABLE "event_supplier_entry_lines"
      ADD CONSTRAINT "event_supplier_entry_lines_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "event_supplier_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
