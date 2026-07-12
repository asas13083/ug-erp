-- AlterTable
ALTER TABLE "custody_transfers" ADD COLUMN     "status" "VoucherStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "vehicles" JSONB;

-- AlterTable
ALTER TABLE "issue_vouchers" ADD COLUMN     "vehicles" JSONB;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "initialQuantity" INTEGER;

-- AlterTable
ALTER TABLE "return_vouchers" ADD COLUMN     "vehicles" JSONB;
