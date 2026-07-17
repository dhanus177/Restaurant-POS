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
      prepStation: item.prepStation ?? 'kitchen',
    })),
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>
    const incomingItems = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : null

    const { items: _ignoredItems, createdAt: _ignoredCreatedAt, ...rawOrderData } = body
    const orderData: Record<string, unknown> = { ...rawOrderData }

    if (typeof rawOrderData.updatedAt === 'string') {
      const parsedUpdatedAt = new Date(rawOrderData.updatedAt)
      orderData.updatedAt = Number.isNaN(parsedUpdatedAt.getTime()) ? undefined : parsedUpdatedAt
    }

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
        throw new Error('ORDER_NOT_FOUND')
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

      await tx.order.update({
        where: { id },
        data: orderData,
      })

      if (incomingItems) {
        await tx.orderItem.deleteMany({ where: { orderId: id } })

        if (incomingItems.length > 0) {
          await tx.orderItem.createMany({
            data: incomingItems.map((item, index) => ({
              id: `${randomUUID()}-${index}`,
              orderId: id,
              menuItemId: String(item.menuItemId),
              name: String(item.name),
              quantity: Number(item.quantity) || 0,
              price: Number(item.price) || 0,
              modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
              prepStation: typeof item.prepStation === 'string' ? item.prepStation : 'kitchen',
              notes: typeof item.notes === 'string' ? item.notes : null,
              chairNumber: typeof item.chairNumber === 'number' ? item.chairNumber : null,
            })),
          })
        }
      }

      return tx.order.findUnique({
        where: { id },
        include: { items: true },
      })
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(toAppOrder(order))
  } catch (error) {
    if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.error('[orders PATCH error]', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
