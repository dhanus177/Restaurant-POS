import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'

function toAppOrder(order: any, prepStationByMenuItemId: Map<string, string> = new Map()) {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item: any) => ({
      ...item,
      modifiers: item.modifiers ?? [],
      prepStation: item.prepStation ?? prepStationByMenuItemId.get(item.menuItemId) ?? 'kitchen',
    })),
  }
}

async function buildPrepStationMap(menuItemIds: string[]) {
  if (menuItemIds.length === 0) return new Map<string, string>()

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, prepStation: true },
  })

  return new Map(menuItems.map((item) => [item.id, item.prepStation]))
}

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  const menuItemIds = Array.from(
    new Set(orders.flatMap((order) => order.items.map((item) => item.menuItemId)).filter(Boolean))
  )
  const prepStationByMenuItemId = await buildPrepStationMap(menuItemIds)
  return NextResponse.json(orders.map((order) => toAppOrder(order, prepStationByMenuItemId)))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, createdAt, updatedAt, ...rest } = body
    const safeItems = Array.isArray(items) ? items : []

    const order = await prisma.order.create({
      data: {
        ...rest,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        items: {
          create: safeItems.map((item: any, index: number) => ({
            id: `${randomUUID()}-${index}`,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers ?? [],
            prepStation: typeof item.prepStation === 'string' ? item.prepStation : 'kitchen',
            notes: item.notes ?? null,
            chairNumber: item.chairNumber ?? null,
          })),
        },
      },
      include: { items: true },
    })

    const prepStationByMenuItemId = await buildPrepStationMap(
      Array.from(new Set(order.items.map((item: any) => item.menuItemId).filter(Boolean)))
    )

    return NextResponse.json(toAppOrder(order, prepStationByMenuItemId), { status: 201 })
  } catch (error) {
    console.error('[orders POST error]', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
