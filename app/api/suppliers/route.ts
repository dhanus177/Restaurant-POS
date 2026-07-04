import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function computeAgingBuckets(entries: Array<{ type: string; amount: number; createdAt: Date }>) {
  const purchases = entries
    .filter((entry) => entry.type === 'purchase' || entry.type === 'grn')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((entry) => ({ ...entry, remaining: entry.amount }))

  let credit = entries
    .filter((entry) => entry.type === 'payment' || entry.type === 'return')
    .reduce((sum, entry) => sum + entry.amount, 0)

  for (const purchase of purchases) {
    if (credit <= 0) break
    const used = Math.min(purchase.remaining, credit)
    purchase.remaining -= used
    credit -= used
  }

  const now = Date.now()
  let aging0to30 = 0
  let aging31to60 = 0
  let aging61to90 = 0
  let aging90plus = 0

  for (const purchase of purchases) {
    if (purchase.remaining <= 0) continue
    const ageDays = Math.floor((now - purchase.createdAt.getTime()) / (24 * 60 * 60 * 1000))

    if (ageDays <= 30) aging0to30 += purchase.remaining
    else if (ageDays <= 60) aging31to60 += purchase.remaining
    else if (ageDays <= 90) aging61to90 += purchase.remaining
    else aging90plus += purchase.remaining
  }

  return {
    aging0to30,
    aging31to60,
    aging61to90,
    aging90plus,
    overdueAmount: aging61to90 + aging90plus,
  }
}

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
    const aging = computeAgingBuckets(ledgerEntries)

    return {
      ...supplier,
      inventoryItemCount: _count.inventoryItems,
      totalPurchases,
      totalPayments,
      balanceDue: totalPurchases - totalPayments,
      ...aging,
    }
  })

  return NextResponse.json(normalized)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supplier = await prisma.supplier.create({ data: body })
  return NextResponse.json(supplier, { status: 201 })
}
