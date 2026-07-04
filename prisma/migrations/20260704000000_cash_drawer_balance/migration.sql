-- CreateTable
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);
