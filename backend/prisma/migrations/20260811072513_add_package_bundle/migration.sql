-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packageGroupId" VARCHAR(64),
ADD COLUMN     "packageId" INTEGER;

-- AlterTable
ALTER TABLE "QuotationDetails" ADD COLUMN     "packageGroupId" VARCHAR(64),
ADD COLUMN     "packageId" INTEGER;

-- CreateTable
CREATE TABLE "Package" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "packageRetailPrice" DECIMAL(18,4) NOT NULL,
    "packageWholeSalePrice" DECIMAL(18,4),
    "image" VARCHAR(200)[],
    "note" VARCHAR(250),
    "isActive" SMALLINT DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItems" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unitId" INTEGER,

    CONSTRAINT "PackageItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_sku_key" ON "Package"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Package_barcode_key" ON "Package"("barcode");

-- CreateIndex
CREATE INDEX "PackageItems_packageId_idx" ON "PackageItems"("packageId");

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItems" ADD CONSTRAINT "PackageItems_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItems" ADD CONSTRAINT "PackageItems_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItems" ADD CONSTRAINT "PackageItems_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDetails" ADD CONSTRAINT "QuotationDetails_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
