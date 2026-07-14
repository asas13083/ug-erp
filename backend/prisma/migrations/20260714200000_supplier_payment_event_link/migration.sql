-- بتسمح إنك تربط دفعة مورد بحفلة معيّنة (اختياري) — عشان "المستحق" في الحفلة
-- نفسها ياخد في الاعتبار الدفعات اللي اتسجّلت من ملف المورد مباشرة، مش بس
-- المدفوع المسجّل جوه كل فاتورة على حدة.
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "eventId" TEXT;

CREATE INDEX IF NOT EXISTS "supplier_payments_eventId_idx" ON "supplier_payments"("eventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'supplier_payments_eventId_fkey'
  ) THEN
    ALTER TABLE "supplier_payments"
      ADD CONSTRAINT "supplier_payments_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
