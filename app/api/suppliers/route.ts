import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
  })

  const normalized = suppliers.map(({ _count, ...supplier }) => ({
    ...supplier,
    inventoryItemCount: _count.inventoryItems,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supplier = await prisma.supplier.create({ data: body })
  return NextResponse.json(supplier, { status: 201 })
}
