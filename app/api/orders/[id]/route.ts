import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'

type JsonRow = Record<string, unknown>

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function pickString(row: JsonRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(row: JsonRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function toAppOrder(order: any) {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item: any) => ({
      ...item,
      modifiers: item.modifiers ?? [],
    })),
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const tableLookup = await prisma.$queryRaw<Array<{ exists: string | null }>>`
    SELECT to_regclass('public.product_recipes')::text AS exists
  `
  const hasProductRecipesTable = Boolean(tableLookup[0]?.exists)

  const order = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!currentOrder) {
      throw new Error('Order not found')
    }

    const nextStatus = normalize((body as Record<string, unknown>).status)
    const shouldDeductIngredients = nextStatus === 'completed' && normalize(currentOrder.status) !== 'completed'
    const nextPaymentStatus = normalize((body as Record<string, unknown>).paymentStatus)
    const shouldAwardLoyalty =
      Boolean(currentOrder.customerId) &&
      nextPaymentStatus === 'paid' &&
      normalize(currentOrder.paymentStatus) !== 'paid'

    if (shouldDeductIngredients && hasProductRecipesTable) {
      const rawRecipes = await tx.$queryRaw<Array<{ row: JsonRow }>>`
        SELECT to_jsonb(pr) AS row
        FROM product_recipes pr
      `

      const recipes = rawRecipes
        .map((r) => r.row)
        .filter((row) => {
          const productKey = normalize(
            pickString(row, ['product_id', 'menu_item_id', 'menuitem_id', 'productId', 'menuItemId'])
          )
          return currentOrder.items.some(
            (item) => normalize(item.menuItemId) === productKey || normalize(item.id) === productKey
          )
        })

      if (recipes.length > 0) {
        const inventoryItems = await tx.inventoryItem.findMany()
        const inventoryById = new Map(inventoryItems.map((item) => [normalize(item.id), item]))
        const inventoryBySku = new Map(inventoryItems.map((item) => [normalize(item.sku), item]))
        const inventoryByName = new Map(inventoryItems.map((item) => [normalize(item.name), item]))

        const deductionByInventoryId = new Map<string, number>()

        for (const orderItem of currentOrder.items) {
          const orderQty = Number(orderItem.quantity) || 0
          if (orderQty <= 0) continue

          const orderProductKey = normalize(orderItem.menuItemId)
          const matchingRecipes = recipes.filter((row) => {
            const productKey = normalize(
              pickString(row, ['product_id', 'menu_item_id', 'menuitem_id', 'productId', 'menuItemId'])
            )
            return productKey === orderProductKey || productKey === normalize(orderItem.id)
          })

          for (const recipe of matchingRecipes) {
            const recipeQty = pickNumber(recipe, [
              'quantity',
              'quantity_required',
              'required_quantity',
              'ingredient_qty',
              'ingredient_quantity',
              'qty',
            ])
            if (!recipeQty || recipeQty <= 0) continue

            const ingredientKey = normalize(
              pickString(recipe, [
                'ingredient_id',
                'inventory_item_id',
                'inventory_id',
                'ingredient_sku',
                'ingredient_name',
                'ingredientId',
                'inventoryItemId',
              ])
            )
            if (!ingredientKey) continue

            const inventoryMatch =
              inventoryById.get(ingredientKey) ??
              inventoryBySku.get(ingredientKey) ??
              inventoryByName.get(ingredientKey)

            if (!inventoryMatch) continue

            const required = recipeQty * orderQty
            const previous = deductionByInventoryId.get(inventoryMatch.id) ?? 0
            deductionByInventoryId.set(inventoryMatch.id, previous + required)
          }
        }

        for (const [inventoryItemId, requiredQty] of deductionByInventoryId.entries()) {
          const inventoryItem = inventoryItems.find((i) => i.id === inventoryItemId)
          if (!inventoryItem) continue

          const deductedQty = Math.min(inventoryItem.quantity, requiredQty)
          if (deductedQty <= 0) continue

          await tx.inventoryItem.update({
            where: { id: inventoryItemId },
            data: {
              quantity: Math.max(0, inventoryItem.quantity - requiredQty),
            },
          })

          await tx.stockAdjustment.create({
            data: {
              id: randomUUID(),
              inventoryItemId,
              type: 'remove',
              quantity: deductedQty,
              reason: `Auto ingredient deduction for completed order #${currentOrder.orderNumber}`,
              createdBy: currentOrder.createdBy,
            },
          })
        }
      }
    }

    if (shouldAwardLoyalty && currentOrder.customerId) {
      const loyaltyEarned = Math.max(1, Math.floor(currentOrder.total / 10))
      await tx.customer.update({
        where: { id: currentOrder.customerId },
        data: {
          orderCount: { increment: 1 },
          lifetimeSpent: { increment: currentOrder.total },
          loyaltyPoints: { increment: loyaltyEarned },
          lastOrderAt: new Date(),
        },
      })
    }

    return tx.order.update({
      where: { id },
      data: body,
      include: { items: true },
    })
  })

  return NextResponse.json(toAppOrder(order))
}
