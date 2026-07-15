-- السماح لأمين المخزن باستبعاد بند وارد من قايمة "زوّد المخزن" (مثلاً بند
-- إيجار مش المفروض يتخزّن) — من غير ما يتشال من تكلفة المورد.
ALTER TABLE "event_supplier_entry_lines"
  ADD COLUMN IF NOT EXISTS "dismissedFromWarehouse" BOOLEAN NOT NULL DEFAULT false;
