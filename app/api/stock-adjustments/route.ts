import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const adjustments = await prisma.stockAdjustment.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(
    adjustments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const inventoryItemId = String(body?.inventoryItemId ?? '').trim()
    const type = String(body?.type ?? '').trim()
    const quantity = Number(body?.quantity ?? 0)
    const reason = String(body?.reason ?? '').trim()
    const createdBy = String(body?.createdBy ?? 'unknown').trim() || 'unknown'
    const createdAt = body?.createdAt
    const location = body?.location === 'storage' ? 'storage' : 'inventory'
    const fromLocation = body?.fromLocation === 'inventory' ? 'inventory' : 'storage'
    const toLocation = body?.toLocation === 'inventory' ? 'inventory' : 'storage'

    if (!inventoryItemId) {
      return NextResponse.json({ error: 'Inventory item is required' }, { status: 400 })
    }

    if (!['add', 'remove', 'waste', 'transfer'].includes(type)) {
      return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 })
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 })
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } })
    if (!item) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

    const currentStorage = Number((item as any).storageQuantity ?? 0)
    let nextInventoryQty = item.quantity
    let nextStorageQty = currentStorage

    if (type === 'transfer') {
      if (fromLocation === toLocation) {
        return NextResponse.json({ error: 'Invalid transfer direction' }, { status: 400 })
      }

      if (fromLocation === 'storage' && toLocation === 'inventory') {
        const moved = Math.min(currentStorage, quantity)
        nextStorageQty = currentStorage - moved
        nextInventoryQty = item.quantity + moved
      } else {
        const moved = Math.min(item.quantity, quantity)
        nextInventoryQty = item.quantity - moved
        nextStorageQty = currentStorage + moved
      }
    } else {
      const targetLocation = location
      const isAdd = type === 'add'

      if (targetLocation === 'storage') {
        nextStorageQty = isAdd ? currentStorage + quantity : Math.max(0, currentStorage - quantity)
      } else {
        nextInventoryQty = isAdd ? item.quantity + quantity : Math.max(0, item.quantity - quantity)
      }
    }

    const adjustmentData = {
      id: typeof body?.id === 'string' && body.id.trim().length > 0 ? body.id.trim() : `adj-${Date.now()}`,
      inventoryItemId,
      type,
      quantity,
      reason: reason || (type === 'add' ? 'Stock added' : type === 'transfer' ? 'Stock transferred' : 'Stock reduced'),
      createdBy,
      createdAt: createdAt ? new Date(createdAt) : undefined,
    }

    const [adjustment] = await prisma.$transaction([
      prisma.stockAdjustment.create({ data: adjustmentData }),
      prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity: nextInventoryQty,
          storageQuantity: nextStorageQty,
          lastRestocked:
            type === 'add' || (type === 'transfer' && toLocation === 'inventory')
              ? new Date()
              : undefined,
        } as any,
      }),
    ])

    return NextResponse.json({ ...adjustment, createdAt: adjustment.createdAt.toISOString() }, { status: 201 })
  } catch (error) {
    console.error('[stock-adjustments POST error]', error)
    return NextResponse.json({ error: 'Failed to save stock adjustment' }, { status: 500 })
  }
}
