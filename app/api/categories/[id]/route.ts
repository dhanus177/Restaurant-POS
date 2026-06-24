import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const category = await prisma.category.update({ where: { id }, data: body })
  return NextResponse.json(category)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.category.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
