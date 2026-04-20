-- DropForeignKey
ALTER TABLE "CustomerEquipmentItem" DROP CONSTRAINT "CustomerEquipmentItem_productAssetItemId_fkey";

-- AlterTable
ALTER TABLE "AdjustmentDetails" ADD COLUMN     "reason" VARCHAR(20);

-- AddForeignKey
ALTER TABLE "CustomerEquipmentItem" ADD CONSTRAINT "CustomerEquipmentItem_productAssetItemId_fkey" FOREIGN KEY ("productAssetItemId") REFERENCES "ProductAssetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
