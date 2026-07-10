-- Add feature lock flags to settings
ALTER TABLE "Settings"
  ADD COLUMN "takeawayPageEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "kitchenPageEnabled" BOOLEAN NOT NULL DEFAULT true;
