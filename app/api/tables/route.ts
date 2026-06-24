import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toAppTable(t: any) {
  return {
    id: t.id,
    number: t.number,
    name: t.name,
    seats: t.seats,
    status: t.status,
    currentOrderId: t.currentOrderId ?? undefined,
  }
}

export async function GET() {
  const tables = await prisma.restaurantTable.findMany({ orderBy: { number: 'asc' } })
  return NextResponse.json(tables.map(toAppTable))
}

export async function POST(req: Request) {
  const body = await req.json()
  const table = await prisma.restaurantTable.create({ data: body })
  return NextResponse.json(toAppTable(table), { status: 201 })
}
