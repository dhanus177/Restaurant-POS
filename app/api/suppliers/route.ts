import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      ledgerEntries: true,
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
  })

  const normalized = suppliers.map(({ _count, ledgerEntries, ...supplier }) => {
    const totalPurchases = ledgerEntries
      .filter((entry) => entry.type === 'purchase' || entry.type === 'grn')
      .reduce((sum, entry) => sum + entry.amount, 0)
    const totalPayments = ledgerEntries
      .filter((entry) => entry.type === 'payment' || entry.type === 'return')
      .reduce((sum, entry) => sum + entry.amount, 0)

    return {
      ...supplier,
      inventoryItemCount: _count.inventoryItems,
      totalPurchases,
      totalPayments,
      balanceDue: totalPurchases - totalPayments,
    }
  })

  return NextResponse.json(normalized)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supplier = await prisma.supplier.create({ data: body })
  return NextResponse.json(supplier, { status: 201 })
}
