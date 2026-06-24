-- CreateTable
CREATE TABLE "product_recipes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_recipes_product_id_idx" ON "product_recipes"("product_id");

-- CreateIndex
CREATE INDEX "product_recipes_ingredient_id_idx" ON "product_recipes"("ingredient_id");

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
