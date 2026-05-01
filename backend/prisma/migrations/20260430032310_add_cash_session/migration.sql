-- CreateTable
CREATE TABLE "CashSession" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "openingUSD" DECIMAL(10,2) NOT NULL,
    "openingKHR" INTEGER NOT NULL,
    "exchangeRate" INTEGER NOT NULL,
    "totalSalesUSD" DECIMAL(10,2) NOT NULL,
    "cashSalesUSD" DECIMAL(10,2) NOT NULL,
    "actualCashUSD" DECIMAL(10,2) NOT NULL,
    "differenceUSD" DECIMAL(10,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "note" VARCHAR(500),
    "paymentSummary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
