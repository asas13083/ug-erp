-- AlterTable
ALTER TABLE "custody_transfers" ADD COLUMN     "handedByUserId" TEXT,
ADD COLUMN     "receivedByUserId" TEXT;

-- AlterTable
ALTER TABLE "issue_vouchers" ADD COLUMN     "handedByUserId" TEXT,
ADD COLUMN     "receivedByUserId" TEXT;

-- AlterTable
ALTER TABLE "return_vouchers" ADD COLUMN     "handedByUserId" TEXT,
ADD COLUMN     "receivedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_handedByUserId_fkey" FOREIGN KEY ("handedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_vouchers" ADD CONSTRAINT "issue_vouchers_handedByUserId_fkey" FOREIGN KEY ("handedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_vouchers" ADD CONSTRAINT "issue_vouchers_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_vouchers" ADD CONSTRAINT "return_vouchers_handedByUserId_fkey" FOREIGN KEY ("handedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_vouchers" ADD CONSTRAINT "return_vouchers_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
