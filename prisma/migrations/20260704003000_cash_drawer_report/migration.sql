-- CreateTable
CREATE TABLE "CashDrawerReport" (
    "id" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "expectedBalance" DOUBLE PRECISION NOT NULL,
    "countedCash" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" TEXT NOT NULL,

    CONSTRAINT "CashDrawerReport_pkey" PRIMARY KEY ("id")
);
