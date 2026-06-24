import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const user = await prisma.user.update({ where: { id }, data: body })
  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
