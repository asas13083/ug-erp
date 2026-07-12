-- CreateEnum
CREATE TYPE "EventCostCategory" AS ENUM ('DECOR_LABOR', 'UNIFORMS', 'TRANSPORT', 'MICROBUS');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "expectedBudget" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "event_purposes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_cost_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_cost_record_entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "EventCostCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "typeLabel" TEXT NOT NULL,
    "purposeId" TEXT,
    "count" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_cost_record_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_purposes_name_key" ON "event_purposes"("name");

-- CreateIndex
CREATE INDEX "event_cost_items_eventId_idx" ON "event_cost_items"("eventId");

-- CreateIndex
CREATE INDEX "event_cost_record_entries_eventId_idx" ON "event_cost_record_entries"("eventId");

-- CreateIndex
CREATE INDEX "event_cost_record_entries_category_idx" ON "event_cost_record_entries"("category");

-- CreateIndex
CREATE INDEX "event_cost_record_entries_purposeId_idx" ON "event_cost_record_entries"("purposeId");

-- AddForeignKey
ALTER TABLE "event_cost_items" ADD CONSTRAINT "event_cost_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cost_items" ADD CONSTRAINT "event_cost_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cost_record_entries" ADD CONSTRAINT "event_cost_record_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cost_record_entries" ADD CONSTRAINT "event_cost_record_entries_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "event_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cost_record_entries" ADD CONSTRAINT "event_cost_record_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
