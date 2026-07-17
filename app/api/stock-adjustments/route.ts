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
  const body = await req.json()
  const { createdAt, ...rest } = body

  // Apply adjustment to inventory quantity
  const item = await prisma.inventoryItem.findUnique({ where: { id: rest.inventoryItemId } })
  if (!item) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

  const delta = rest.type === 'add' ? rest.quantity : -rest.quantity
  const newQty = Math.max(0, item.quantity + delta)

  const [adjustment] = await prisma.$transaction([
    prisma.stockAdjustment.create({
      data: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined },
    }),
    prisma.inventoryItem.update({
      where: { id: rest.inventoryItemId },
      data: {
        quantity: newQty,
        lastRestocked: rest.type === 'add' ? new Date() : undefined,
      },
    }),
  ])

  return NextResponse.json({ ...adjustment, createdAt: adjustment.createdAt.toISOString() }, { status: 201 })
}
