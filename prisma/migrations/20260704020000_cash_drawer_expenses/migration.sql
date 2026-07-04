-- CreateTable
CREATE TABLE "CashDrawerExpense" (
    "id" TEXT NOT NULL,
    "drawerId" TEXT NOT NULL DEFAULT 'singleton',
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CashDrawerExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashDrawerExpense_drawerId_idx" ON "CashDrawerExpense"("drawerId");

-- CreateIndex
CREATE INDEX "CashDrawerExpense_createdAt_idx" ON "CashDrawerExpense"("createdAt");

-- AddForeignKey
ALTER TABLE "CashDrawerExpense" ADD CONSTRAINT "CashDrawerExpense_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "CashDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
