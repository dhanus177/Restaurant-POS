import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function toAppLedgerEntry(entry: {
  id: string
  supplierId: string
  type: string
  reference: string | null
  inventoryItemId: string | null
  quantity: number | null
  amount: number
  paymentMethod: string | null
  linkedEntryId: string | null
  billItems: unknown
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

  const type = String(body?.type ?? '')
  const amount = Number(body?.amount)
  const quantity = body?.quantity === null || body?.quantity === undefined || body?.quantity === ''
    ? null
    : Number(body.quantity)

  if (!['purchase', 'payment', 'grn', 'return'].includes(type)) {
    return NextResponse.json({ error: 'Invalid supplier ledger type' }, { status: 400 })
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 })
  }

  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
    return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 })
  }

  const paymentMethod = body?.paymentMethod === null || body?.paymentMethod === undefined || body?.paymentMethod === ''
    ? null
    : String(body.paymentMethod)

  if (paymentMethod !== null && !['cash', 'cheque', 'bank-transfer'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Invalid supplier payment method' }, { status: 400 })
  }

  const linkedEntryId = typeof body?.linkedEntryId === 'string' && body.linkedEntryId.trim()
    ? body.linkedEntryId.trim()
    : null

  const billItems = Array.isArray(body?.billItems)
    ? body.billItems
        .map((item: any) => {
          const name = typeof item?.name === 'string' ? item.name.trim() : ''
          const itemQuantity = Number(item?.quantity)
          const unitPrice = Number(item?.unitPrice)
          const total = Number(item?.total)

          if (!name || !Number.isFinite(itemQuantity) || itemQuantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(total) || total < 0) {
            return null
          }

          return {
            id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
            name,
            quantity: itemQuantity,
            unitPrice,
            total,
          }
        })
        .filter(Boolean)
    : []

  if ((type === 'purchase' || type === 'grn') && billItems.length === 0) {
    return NextResponse.json({ error: 'At least one order item is required for purchases and GRN entries.' }, { status: 400 })
  }

  if (type === 'payment' && !paymentMethod) {
    return NextResponse.json({ error: 'Payment method is required for supplier payments.' }, { status: 400 })
  }

  if (type === 'payment' && !linkedEntryId) {
    return NextResponse.json({ error: 'Select the bill/invoice for this payment.' }, { status: 400 })
  }

  if (type === 'payment' && linkedEntryId) {
    const linkedBill = await prisma.supplierLedgerEntry.findFirst({
      where: {
        id: linkedEntryId,
        supplierId: id,
        type: { in: ['purchase', 'grn'] },
      },
    })

    if (!linkedBill) {
      return NextResponse.json({ error: 'Selected supplier bill was not found.' }, { status: 404 })
    }

    const appliedPayments = await prisma.supplierLedgerEntry.findMany({
      where: {
        supplierId: id,
        linkedEntryId,
        type: { in: ['payment', 'return'] },
      },
    })

    const paidAmount = appliedPayments.reduce((sum, entry) => sum + entry.amount, 0)
    const remainingAmount = linkedBill.amount - paidAmount

    if (amount > remainingAmount) {
      return NextResponse.json({ error: `Payment exceeds remaining balance. Remaining balance is ${remainingAmount.toFixed(2)}.` }, { status: 400 })
    }
  }

  const entry = await prisma.supplierLedgerEntry.create({
    data: {
      supplierId: id,
      type,
      reference: typeof body?.reference === 'string' && body.reference.trim() ? body.reference.trim() : null,
      inventoryItemId: typeof body?.inventoryItemId === 'string' && body.inventoryItemId.trim() ? body.inventoryItemId.trim() : null,
      quantity,
      amount,
      paymentMethod,
      linkedEntryId,
      billItems: billItems as Prisma.InputJsonValue,
      notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    },
  })

  return NextResponse.json(toAppLedgerEntry(entry), { status: 201 })
}
