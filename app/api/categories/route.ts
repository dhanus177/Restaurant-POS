import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const body = await req.json()
  const category = await prisma.category.create({
    data: {
      ...body,
      id: body.id || randomUUID(),
    },
  })
  return NextResponse.json(category, { status: 201 })
}
