-- Add unitId column to CustomerEquipmentItem for non-tracked quantity display unit
ALTER TABLE "CustomerEquipmentItem" ADD COLUMN "unitId" INTEGER;

-- AddForeignKey: CustomerEquipmentItem.unitId → Units
ALTER TABLE "CustomerEquipmentItem" ADD CONSTRAINT "CustomerEquipmentItem_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
