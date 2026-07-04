import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'

function toAppReport(report: {
  id: string
  openingBalance: number
  expectedBalance: number
  countedCash: number
  variance: number
  notes: string | null
  closedAt: Date
  closedBy: string
}) {
  return {
    ...report,
    notes: report.notes ?? null,
    closedAt: report.closedAt.toISOString(),
  }
}

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin', 'pay-counter'])
  if (!actor.ok) return actor.response

  const reports = await prisma.cashDrawerReport.findMany({ orderBy: { closedAt: 'desc' } })
  return NextResponse.json(reports.map(toAppReport))
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin'])
  if (!actor.ok) return actor.response

  const body = await req.json()
  const openingBalance = Number(body?.openingBalance)
  const expectedBalance = Number(body?.expectedBalance)
  const countedCash = Number(body?.countedCash)
  const variance = Number(body?.variance)

  if (![openingBalance, expectedBalance, countedCash, variance].every((value) => Number.isFinite(value))) {
    return NextResponse.json({ error: 'Invalid cash drawer report values' }, { status: 400 })
  }

  const report = await prisma.cashDrawerReport.create({
    data: {
      openingBalance,
      expectedBalance,
      countedCash,
      variance,
      notes: typeof body?.notes === 'string' ? body.notes : null,
      closedBy: actor.value.id,
    },
  })

  return NextResponse.json(toAppReport(report), { status: 201 })
}