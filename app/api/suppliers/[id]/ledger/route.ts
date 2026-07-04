import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toAppLedgerEntry(entry: {
  id: string
  supplierId: string
  type: string
  reference: string | null
  inventoryItemId: string | null
  quantity: number | null
  amount: number
  notes: string | null
  createdAt: Date
}) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entries = await prisma.supplierLedgerEntry.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entries.map(toAppLedgerEntry))
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const amount = Number(body?.amount)
  const quantity = body?.quantity === null || body?.quantity === undefined || body?.quantity === ''
    ? null
    : Number(body.quantity)

  if (!['purchase', 'payment', 'grn', 'return'].includes(body?.type)) {
    return NextResponse.json({ error: 'Invalid supplier ledger type' }, { status: 400 })
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 })
  }

  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
    return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 })
  }

  const entry = await prisma.supplierLedgerEntry.create({
    data: {
      supplierId: id,
      type: body.type,
      reference: typeof body?.reference === 'string' && body.reference.trim() ? body.reference.trim() : null,
      inventoryItemId: typeof body?.inventoryItemId === 'string' && body.inventoryItemId.trim() ? body.inventoryItemId.trim() : null,
      quantity,
      amount,
      notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    },
  })

  return NextResponse.json(toAppLedgerEntry(entry), { status: 201 })
}