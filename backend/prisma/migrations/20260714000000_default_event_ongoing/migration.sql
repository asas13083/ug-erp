-- تغيير الحالة الافتراضية للحفلة الجديدة من "مخططة" لـ"جارية"
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'ONGOING';

-- تحويل أي حفلة قديمة لسه حالتها "مخططة" لـ"جارية" (بما إننا شلنا الحالة دي)
UPDATE "events" SET "status" = 'ONGOING' WHERE "status" = 'PLANNED';
