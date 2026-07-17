import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'
import { writeAuditLog } from '@/lib/audit-log'

function toAppShift(shift: {
  id: string
  openedAt: Date
  openedBy: string
  openingFloat: number
  status: string
  notes: string | null
  closedAt: Date | null
  closedBy: string | null
  expectedCash: number | null
  countedCash: number | null
  variance: number | null
  denominations: any
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...shift,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() ?? null,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'cashier'])
  if (!actor.ok) return actor.response

  const { id } = await params
  const body = await req.json()

  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) {
    return NextResponse.json({ error: 'Shift not found.' }, { status: 404 })
  }

  if (shift.status !== 'open') {
    return NextResponse.json({ error: 'Shift already closed.' }, { status: 409 })
  }

  const expectedCash = Number(body?.expectedCash)
  const countedCash = Number(body?.countedCash)
  const variance = Number(body?.variance)

  if (![expectedCash, countedCash, variance].every((value) => Number.isFinite(value))) {
    return NextResponse.json({ error: 'Invalid shift close-out values.' }, { status: 400 })
  }

  const denominations = body?.denominations && typeof body.denominations === 'object' ? body.denominations : null
  const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null

  const result = await prisma.$transaction(async (tx) => {
    const closedShift = await tx.shift.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: actor.value.id,
        expectedCash,
        countedCash,
        variance,
        denominations: denominations as Prisma.InputJsonValue | undefined,
        notes: notes ?? shift.notes,
      },
    })

    const report = await tx.cashDrawerReport.create({
      data: {
        openingBalance: shift.openingFloat,
        expectedBalance: expectedCash,
        countedCash,
        variance,
        notes: notes ?? shift.notes,
        closedBy: actor.value.id,
      },
    })

    return { closedShift, report }
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'shift.close',
    resource: 'shift',
    resourceId: result.closedShift.id,
    details: {
      expectedCash,
      countedCash,
      variance,
      denominations,
      reportId: result.report.id,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'cash_drawer.close_out',
    resource: 'cash_drawer_report',
    resourceId: result.report.id,
    details: {
      openingBalance: result.report.openingBalance,
      expectedBalance: result.report.expectedBalance,
      countedCash: result.report.countedCash,
      variance: result.report.variance,
      source: 'shift-close',
    },
  })

  return NextResponse.json({
    shift: toAppShift(result.closedShift),
    report: {
      ...result.report,
      closedAt: result.report.closedAt.toISOString(),
    },
  })
}
