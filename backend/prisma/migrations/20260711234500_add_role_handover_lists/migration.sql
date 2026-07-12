-- إضافة عمود appearsInHandoverLists لجدول roles (اللي كان ناقص من التحديث السابق)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "appearsInHandoverLists" BOOLEAN NOT NULL DEFAULT false;
