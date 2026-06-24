import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(orders.map(toAppOrder))
}

export async function POST(req: Request) {
  const body = await req.json()
  const { items, createdAt, updatedAt, ...rest } = body
  const order = await prisma.order.create({
    data: {
      ...rest,
      createdAt: createdAt ? new Date(createdAt) : undefined,
      items: {
        create: items.map((item: any) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers ?? [],
          notes: item.notes ?? null,
        })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json(toAppOrder(order), { status: 201 })
}
