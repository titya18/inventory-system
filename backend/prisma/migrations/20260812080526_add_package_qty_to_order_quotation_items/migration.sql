-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packageQty" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "QuotationDetails" ADD COLUMN     "packageQty" DECIMAL(10,4);
