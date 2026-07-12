/*
  Warnings:

  - Added the required column `warehouseId` to the `return_vouchers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "loss_records" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "return_vouchers" ADD COLUMN     "warehouseId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "loss_records_warehouseId_idx" ON "loss_records"("warehouseId");

-- CreateIndex
CREATE INDEX "return_vouchers_warehouseId_idx" ON "return_vouchers"("warehouseId");

-- AddForeignKey
ALTER TABLE "return_vouchers" ADD CONSTRAINT "return_vouchers_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss_records" ADD CONSTRAINT "loss_records_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
