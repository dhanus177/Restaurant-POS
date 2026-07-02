-- Add loyalty and customer aggregate fields
ALTER TABLE "Customer"
ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lifetimeSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "orderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastOrderAt" TIMESTAMP(3);
