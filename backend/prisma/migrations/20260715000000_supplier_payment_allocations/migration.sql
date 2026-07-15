-- إلغاء فكرة "ربط الدفعة بحفلة واحدة" (عمود eventId على الدفعة) والاستعاضة
-- عنها بتوزيع الدفعة على فواتير معيّنة عبر جدول تخصيصات مستقل.

-- 1) نشيل عمود eventId القديم من الدفعات (لو موجود من الميجريشن السابقة)
ALTER TABLE "supplier_payments" DROP CONSTRAINT IF EXISTS "supplier_payments_eventId_fkey";
DROP INDEX IF EXISTS "supplier_payments_eventId_idx";
ALTER TABLE "supplier_payments" DROP COLUMN IF EXISTS "eventId";

-- 2) جدول تخصيص جزء من دفعة لفاتورة مورد معيّنة
CREATE TABLE IF NOT EXISTS "supplier_payment_allocations" (
  "id"        TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "entryId"   TEXT NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_paymentId_idx" ON "supplier_payment_allocations"("paymentId");
CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_entryId_idx" ON "supplier_payment_allocations"("entryId");

ALTER TABLE "supplier_payment_allocations"
  ADD CONSTRAINT "supplier_payment_allocations_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "supplier_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_payment_allocations"
  ADD CONSTRAINT "supplier_payment_allocations_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "event_supplier_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
