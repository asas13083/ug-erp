-- AlterTable
ALTER TABLE "event_cost_record_entries" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT,
ADD COLUMN     "sourceVehicleIndex" INTEGER;

-- CreateIndex
CREATE INDEX "event_cost_record_entries_sourceType_sourceId_idx" ON "event_cost_record_entries"("sourceType", "sourceId");
