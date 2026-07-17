import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ParsedBillItem = {
  id: string
  inventoryItemId: string
  unit: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

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

  const rawBillItems: ParsedBillItem[] = Array.isArray(body?.billItems)
    ? body.billItems
        .map((item: any) => {
          const inventoryItemId = typeof item?.inventoryItemId === 'string' ? item.inventoryItemId.trim() : ''
          const unit = typeof item?.unit === 'string' ? item.unit.trim() : ''
          const name = typeof item?.name === 'string' ? item.name.trim() : ''
          const itemQuantity = Number(item?.quantity)
          const unitPrice = Number(item?.unitPrice)
          const total = Number(item?.total)

          if (!Number.isFinite(itemQuantity) || itemQuantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(total) || total < 0) {
            return null
          }

          return {
            id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
            inventoryItemId,
            unit,
            name,
            quantity: itemQuantity,
            unitPrice,
            total,
          }
        })
        .filter(Boolean)
    : []

  let billItems: ParsedBillItem[] = rawBillItems

  if ((type === 'purchase' || type === 'grn') && billItems.length === 0) {
    return NextResponse.json({ error: 'At least one order item is required for purchases and GRN entries.' }, { status: 400 })
  }

  if (type === 'purchase' || type === 'grn') {
    if (billItems.some((item) => !item.inventoryItemId && !item.name.trim())) {
      return NextResponse.json({ error: 'Each order item must be linked to inventory or include a new item name.' }, { status: 400 })
    }

    if (billItems.some((item) => !item.unit)) {
      return NextResponse.json({ error: 'Each order item must include a unit.' }, { status: 400 })
    }

    const selectedInventoryItemIds: string[] = Array.from(new Set(billItems.map((item) => item.inventoryItemId).filter(Boolean)))
    if (selectedInventoryItemIds.length > 0) {
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          id: { in: selectedInventoryItemIds },
          supplierId: id,
        },
      })

      const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]))

      if (inventoryById.size !== selectedInventoryItemIds.length) {
        return NextResponse.json({ error: 'One or more order items are not linked to this supplier inventory.' }, { status: 400 })
      }

      billItems = billItems.map((item) => ({
        ...item,
        name: item.inventoryItemId ? inventoryById.get(item.inventoryItemId)?.name ?? item.name : item.name,
        unit: item.inventoryItemId ? inventoryById.get(item.inventoryItemId)?.unit ?? item.unit : item.unit,
      }))
    }
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
