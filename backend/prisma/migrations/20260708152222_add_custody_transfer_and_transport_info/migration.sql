-- AlterTable
ALTER TABLE "issue_vouchers" ADD COLUMN     "transportInfo" TEXT;

-- AlterTable
ALTER TABLE "return_vouchers" ADD COLUMN     "transportInfo" TEXT;

-- CreateTable
CREATE TABLE "custody_transfers" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fromEventId" TEXT NOT NULL,
    "toEventId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "transportInfo" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "custody_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custody_transfers_number_key" ON "custody_transfers"("number");

-- CreateIndex
CREATE INDEX "custody_transfers_fromEventId_idx" ON "custody_transfers"("fromEventId");

-- CreateIndex
CREATE INDEX "custody_transfers_toEventId_idx" ON "custody_transfers"("toEventId");

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_fromEventId_fkey" FOREIGN KEY ("fromEventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_toEventId_fkey" FOREIGN KEY ("toEventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfer_items" ADD CONSTRAINT "custody_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "custody_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfer_items" ADD CONSTRAINT "custody_transfer_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
