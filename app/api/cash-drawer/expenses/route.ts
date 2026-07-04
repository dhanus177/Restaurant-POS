import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'
import { writeAuditLog } from '@/lib/audit-log'

function toAppExpense(expense: {
  id: string
  drawerId: string
  amount: number
  reason: string
  createdAt: Date
  createdBy: string
}) {
  return {
    ...expense,
    createdAt: expense.createdAt.toISOString(),
  }
}

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'pay-counter'])
  if (!actor.ok) return actor.response

  const expenses = await prisma.cashDrawerExpense.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(expenses.map(toAppExpense))
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'pay-counter'])
  if (!actor.ok) return actor.response

  const body = await req.json()
  const amount = Number(body?.amount)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Cash-out amount must be greater than zero' }, { status: 400 })
  }

  if (!reason) {
    return NextResponse.json({ error: 'Cash-out reason is required' }, { status: 400 })
  }

  await prisma.cashDrawer.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', openingBalance: 0 },
  })

  const expense = await prisma.cashDrawerExpense.create({
    data: {
      drawerId: 'singleton',
      amount,
      reason,
      createdBy: actor.value.id,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'cash_drawer.expense',
    resource: 'cash_drawer_expense',
    resourceId: expense.id,
    details: {
      amount,
      reason,
    },
  })

  return NextResponse.json(toAppExpense(expense), { status: 201 })
}