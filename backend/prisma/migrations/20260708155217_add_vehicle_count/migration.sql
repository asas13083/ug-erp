-- AlterTable
ALTER TABLE "custody_transfers" ADD COLUMN     "vehicleCount" INTEGER;

-- AlterTable
ALTER TABLE "issue_vouchers" ADD COLUMN     "vehicleCount" INTEGER;

-- AlterTable
ALTER TABLE "return_vouchers" ADD COLUMN     "vehicleCount" INTEGER;
