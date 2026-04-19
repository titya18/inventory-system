-- CreateEnum
CREATE TYPE "AssignType" AS ENUM ('SOLD', 'RENTED', 'INSTALLED');

-- CreateTable
CREATE TABLE "CustomerEquipment" (
    "id" SERIAL NOT NULL,
    "ref" VARCHAR(50) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productAssetItemId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "assignType" "AssignType" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "note" VARCHAR(500),
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" INTEGER,

    CONSTRAINT "CustomerEquipment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_productAssetItemId_fkey" FOREIGN KEY ("productAssetItemId") REFERENCES "ProductAssetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEquipment" ADD CONSTRAINT "CustomerEquipment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
