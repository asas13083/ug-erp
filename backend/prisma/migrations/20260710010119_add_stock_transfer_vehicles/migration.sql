-- AlterTable
ALTER TABLE "stock_transfers" ADD COLUMN     "transportInfo" TEXT,
ADD COLUMN     "vehicleCount" INTEGER,
ADD COLUMN     "vehicles" JSONB;
