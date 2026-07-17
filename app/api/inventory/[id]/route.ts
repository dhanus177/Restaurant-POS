import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { lastRestocked, ...rest } = body
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...rest,
      storageQuantity: rest?.storageQuantity === undefined ? undefined : Number(rest.storageQuantity ?? 0),
      lastRestocked: lastRestocked ? new Date(lastRestocked) : undefined,
    },
  })
  return NextResponse.json({ ...item, storageQuantity: Number(item.storageQuantity ?? 0), lastRestocked: item.lastRestocked?.toISOString() ?? undefined })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.inventoryItem.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
