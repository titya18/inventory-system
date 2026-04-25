-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyNameKh" VARCHAR(200),
    "companyNameEn" VARCHAR(200),
    "addressKh" TEXT,
    "addressEn" TEXT,
    "phone" VARCHAR(50),
    "vatNumber" VARCHAR(100),
    "logoUrl" VARCHAR(500),
    "invoiceTerms" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);
