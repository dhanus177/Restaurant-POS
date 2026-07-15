ALTER TABLE "Settings"
ADD COLUMN IF NOT EXISTS "waiterVisibleCategoryIds" JSONB;
