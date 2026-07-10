import { NextResponse } from 'next/server'
import { requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'
import { runWhatsAppReportScheduler } from '@/lib/whatsapp-reports'

const MEALS = new Set(['breakfast', 'lunch', 'dinner'])

function hasValidSchedulerToken(req: Request) {
  const expected = process.env.WHATSAPP_REPORTS_SCHEDULER_TOKEN
  if (!expected) return false

  const provided = req.headers.get('x-scheduler-token')
  return typeof provided === 'string' && provided.length > 0 && provided === expected
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const authorizedByToken = hasValidSchedulerToken(req)
  if (!authorizedByToken) {
    const actor = await requireSuperAdmin(req)
    if (!actor.ok) return actor.response
  }

  const body = (await req.json().catch(() => ({}))) as { force?: boolean; meal?: string }
  const force = body.force === true
  const meal = typeof body.meal === 'string' && MEALS.has(body.meal) ? (body.meal as 'breakfast' | 'lunch' | 'dinner') : undefined

  const result = await runWhatsAppReportScheduler({ force, meal })
  return NextResponse.json(result)
}

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  return NextResponse.json({
    ok: true,
    hint: 'Call POST to run scheduler. Use x-scheduler-token header for unattended cron calls.',
  })
}
