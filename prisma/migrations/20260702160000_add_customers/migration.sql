-- Create customers table
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- Extend orders with customer snapshot fields
ALTER TABLE "Order"
    ADD COLUMN "customerId" TEXT,
    ADD COLUMN "customerName" TEXT,
    ADD COLUMN "customerPhone" TEXT;

-- Index for optional customer lookups
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- Relational link to customers
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
