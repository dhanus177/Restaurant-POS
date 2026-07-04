import { NextResponse } from 'next/server'
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

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'pay-counter'])
  if (!actor.ok) return actor.response

  const shifts = await prisma.shift.findMany({
    orderBy: { openedAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(shifts.map(toAppShift))
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'pay-counter'])
  if (!actor.ok) return actor.response

  const existingOpenShift = await prisma.shift.findFirst({ where: { status: 'open' } })
  if (existingOpenShift) {
    return NextResponse.json({ error: 'An open shift already exists.' }, { status: 409 })
  }

  const body = await req.json()
  const openingFloat = Number(body?.openingFloat)
  if (!Number.isFinite(openingFloat) || openingFloat < 0) {
    return NextResponse.json({ error: 'Opening float must be a non-negative number.' }, { status: 400 })
  }

  const shift = await prisma.shift.create({
    data: {
      openedBy: actor.value.id,
      openingFloat,
      notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'shift.open',
    resource: 'shift',
    resourceId: shift.id,
    details: {
      openingFloat,
      notes: shift.notes,
    },
  })

  return NextResponse.json(toAppShift(shift), { status: 201 })
}
