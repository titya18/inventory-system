-- Add productId column to ProductAssetItem
ALTER TABLE "ProductAssetItem" ADD COLUMN "productId" INTEGER;

-- Backfill productId from ProductVariants
UPDATE "ProductAssetItem" pai
SET "productId" = pv."productId"
FROM "ProductVariants" pv
WHERE pai."productVariantId" = pv.id;

-- Drop old serial number unique constraint (per variant)
DROP INDEX IF EXISTS "ProductAssetItem_productVariantId_serialNumber_key";

-- Create new serial number unique constraint (per product, across New/SH)
-- NULL productId rows are ignored by unique constraint (safe for legacy data)
CREATE UNIQUE INDEX "ProductAssetItem_productId_serialNumber_key"
ON "ProductAssetItem"("productId", "serialNumber");

-- Add foreign key to Products
ALTER TABLE "ProductAssetItem"
ADD CONSTRAINT "ProductAssetItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
