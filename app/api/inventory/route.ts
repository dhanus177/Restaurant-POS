import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(
    items.map((i) => ({
      ...i,
      storageQuantity: Number(i.storageQuantity ?? 0),
      lastRestocked: i.lastRestocked?.toISOString() ?? undefined,
    }))
  )
}

export async function POST(req: Request) {
  const body = await req.json()
  const { lastRestocked, ...rest } = body
  const item = await prisma.inventoryItem.create({
    data: {
      ...rest,
      storageQuantity: Number(rest?.storageQuantity ?? 0),
      lastRestocked: lastRestocked ? new Date(lastRestocked) : null,
    },
  })
  return NextResponse.json(
    { ...item, storageQuantity: Number(item.storageQuantity ?? 0), lastRestocked: item.lastRestocked?.toISOString() ?? undefined },
    { status: 201 }
  )
}
