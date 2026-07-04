import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'

function toAppCashDrawer(drawer: {
  id: string
  openingBalance: number
  notes: string | null
  openedAt: Date | null
  updatedAt: Date
}) {
  return {
    ...drawer,
    openedAt: drawer.openedAt?.toISOString() ?? undefined,
    updatedAt: drawer.updatedAt.toISOString(),
  }
}

export async function GET() {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const drawer = await prisma.cashDrawer.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json(drawer ? toAppCashDrawer(drawer) : null)
}

export async function PATCH(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin'])
  if (!actor.ok) return actor.response

  const body = await req.json()
  const openingBalance = Number(body?.openingBalance)

  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    return NextResponse.json({ error: 'Opening balance must be a non-negative number' }, { status: 400 })
  }

  const drawer = await prisma.cashDrawer.upsert({
    where: { id: 'singleton' },
    update: {
      openingBalance,
      notes: typeof body?.notes === 'string' ? body.notes : null,
      openedAt: body?.openedAt ? new Date(body.openedAt) : undefined,
    },
    create: {
      id: 'singleton',
      openingBalance,
      notes: typeof body?.notes === 'string' ? body.notes : null,
      openedAt: body?.openedAt ? new Date(body.openedAt) : null,
    },
  })

  return NextResponse.json(toAppCashDrawer(drawer))
}