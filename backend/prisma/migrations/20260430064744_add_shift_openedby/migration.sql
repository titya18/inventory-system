-- AlterTable
ALTER TABLE "CashSession" ADD COLUMN     "openedById" INTEGER,
ADD COLUMN     "shift" VARCHAR(50);

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
