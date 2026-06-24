import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { lastRestocked, ...rest } = body
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { ...rest, lastRestocked: lastRestocked ? new Date(lastRestocked) : undefined },
  })
  return NextResponse.json({ ...item, lastRestocked: item.lastRestocked?.toISOString() ?? undefined })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.inventoryItem.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
