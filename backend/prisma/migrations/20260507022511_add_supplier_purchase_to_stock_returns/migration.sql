/*
  Warnings:

  - Added the required column `supplierId` to the `StockReturns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add supplierId with temp default for existing rows
ALTER TABLE "StockReturns" ADD COLUMN "purchaseId" INTEGER;
ALTER TABLE "StockReturns" ADD COLUMN "supplierId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StockReturns" ALTER COLUMN "supplierId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "StockReturns" ADD CONSTRAINT "StockReturns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReturns" ADD CONSTRAINT "StockReturns_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
