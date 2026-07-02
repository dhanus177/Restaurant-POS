import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'

export async function GET() {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const usersCount = await prisma.user.count()
  if (usersCount > 0) {
    const actor = await requireSuperAdmin(req)
    if (!actor.ok) return actor.response
  }

  const body = await req.json()
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: body,
    create: { id: 'singleton', ...body },
  })
  return NextResponse.json(settings)
}
