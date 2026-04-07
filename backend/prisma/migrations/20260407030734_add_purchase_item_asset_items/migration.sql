-- CreateTable
CREATE TABLE "PurchaseDetailTrackedItem" (
    "id" SERIAL NOT NULL,
    "purchaseDetailId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "assetCode" TEXT,
    "macAddress" TEXT,
    "serialNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDetailTrackedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationDetailAssetItem" (
    "id" SERIAL NOT NULL,
    "quotationDetailId" INTEGER NOT NULL,
    "productAssetItemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationDetailAssetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseDetailTrackedItem_purchaseDetailId_idx" ON "PurchaseDetailTrackedItem"("purchaseDetailId");

-- CreateIndex
CREATE INDEX "QuotationDetailAssetItem_quotationDetailId_idx" ON "QuotationDetailAssetItem"("quotationDetailId");

-- CreateIndex
CREATE INDEX "QuotationDetailAssetItem_productAssetItemId_idx" ON "QuotationDetailAssetItem"("productAssetItemId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationDetailAssetItem_quotationDetailId_productAssetItem_key" ON "QuotationDetailAssetItem"("quotationDetailId", "productAssetItemId");

-- AddForeignKey
ALTER TABLE "PurchaseDetailTrackedItem" ADD CONSTRAINT "PurchaseDetailTrackedItem_purchaseDetailId_fkey" FOREIGN KEY ("purchaseDetailId") REFERENCES "PurchaseDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDetailAssetItem" ADD CONSTRAINT "QuotationDetailAssetItem_quotationDetailId_fkey" FOREIGN KEY ("quotationDetailId") REFERENCES "QuotationDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDetailAssetItem" ADD CONSTRAINT "QuotationDetailAssetItem_productAssetItemId_fkey" FOREIGN KEY ("productAssetItemId") REFERENCES "ProductAssetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
