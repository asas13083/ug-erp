-- AlterTable
ALTER TABLE "loss_records" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "VoucherStatus" NOT NULL DEFAULT 'CONFIRMED';
