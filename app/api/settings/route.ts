import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: body,
      create: { id: 'singleton', ...body },
    })
    return NextResponse.json(settings)
  } catch (error) {
    const isMissingColumn =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022'

    if (isMissingColumn) {
      return NextResponse.json(
        {
          error:
            'Database is missing the latest settings columns. Run prisma migrate deploy (or redeploy containers) and try again.',
        },
        { status: 500 }
      )
    }

    console.error('[settings.patch error]', error)
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
