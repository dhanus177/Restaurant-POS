ALTER TABLE "SupplierLedgerEntry"
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "linkedEntryId" TEXT,
ADD COLUMN IF NOT EXISTS "billItems" JSONB;

CREATE INDEX IF NOT EXISTS "SupplierLedgerEntry_linkedEntryId_idx" ON "SupplierLedgerEntry"("linkedEntryId");
