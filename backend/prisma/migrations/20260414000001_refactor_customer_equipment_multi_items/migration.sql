-- CreateTable: CustomerEquipmentItem (new join table for multi-serial support)
CREATE TABLE "CustomerEquipmentItem" (
    "id" SERIAL NOT NULL,
    "customerEquipmentId" INTEGER NOT NULL,
    "productAssetItemId" INTEGER NOT NULL,

    CONSTRAINT "CustomerEquipmentItem_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data: move each record's single serial into the new table
INSERT INTO "CustomerEquipmentItem" ("customerEquipmentId", "productAssetItemId")
SELECT "id", "productAssetItemId" FROM "CustomerEquipment";

-- Drop old FK constraint on CustomerEquipment.productAssetItemId
ALTER TABLE "CustomerEquipment" DROP CONSTRAINT IF EXISTS "CustomerEquipment_productAssetItemId_fkey";

-- Drop the column from CustomerEquipment
ALTER TABLE "CustomerEquipment" DROP COLUMN IF EXISTS "productAssetItemId";

-- AddForeignKey: CustomerEquipmentItem → CustomerEquipment (CASCADE delete)
ALTER TABLE "CustomerEquipmentItem" ADD CONSTRAINT "CustomerEquipmentItem_customerEquipmentId_fkey"
    FOREIGN KEY ("customerEquipmentId") REFERENCES "CustomerEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CustomerEquipmentItem → ProductAssetItem
ALTER TABLE "CustomerEquipmentItem" ADD CONSTRAINT "CustomerEquipmentItem_productAssetItemId_fkey"
    FOREIGN KEY ("productAssetItemId") REFERENCES "ProductAssetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
