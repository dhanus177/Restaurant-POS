import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'

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

  const shift = await prisma.shift.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })
  return NextResponse.json(shift ? toAppShift(shift) : null)
}
