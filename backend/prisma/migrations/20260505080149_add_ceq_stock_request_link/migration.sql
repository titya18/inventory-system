-- AlterTable
ALTER TABLE "CustomerEquipment" ADD COLUMN     "stockRequestId" INTEGER;

-- AlterTable
ALTER TABLE "StockRequests" ADD COLUMN     "orderId" INTEGER;

-- AddForeignKey
ALTER TABLE "StockRequests" ADD CONSTRAINT "StockRequests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_stockRequestId_fkey" FOREIGN KEY ("stockRequestId") REFERENCES "StockRequests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
