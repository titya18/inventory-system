-- Make productAssetItemId optional (nullable) on CustomerEquipmentItem
ALTER TABLE "CustomerEquipmentItem" ALTER COLUMN "productAssetItemId" DROP NOT NULL;

-- Add productVariantId for non-tracked product lines
ALTER TABLE "CustomerEquipmentItem" ADD COLUMN "productVariantId" INTEGER;

-- Add quantity for non-tracked product lines
ALTER TABLE "CustomerEquipmentItem" ADD COLUMN "quantity" INTEGER;

-- AddForeignKey: CustomerEquipmentItem.productVariantId → ProductVariants
ALTER TABLE "CustomerEquipmentItem" ADD CONSTRAINT "CustomerEquipmentItem_productVariantId_fkey"
    FOREIGN KEY ("productVariantId") REFERENCES "ProductVariants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
