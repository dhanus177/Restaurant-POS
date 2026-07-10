import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'
import { writeAuditLog } from '@/lib/audit-log'

export async function GET() {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const users = await prisma.user.findMany()
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const body = await req.json()
  const existingUsersCount = await prisma.user.count()

  let actorForAudit: { id?: string; role?: string; name?: string } = {}

  // Super-admin bootstrap must happen through setup, not staff API.
  if (body?.role === 'super-admin' && existingUsersCount === 0) {
    return NextResponse.json(
      { error: 'Initial super-admin account must be created through setup.' },
      { status: 403 }
    )
  }

  if (existingUsersCount > 0) {
    const actor = await requireRole(req, ['admin', 'super-admin'])
    if (!actor.ok) return actor.response

    if (body?.role === 'super-admin' && actor.value.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Only super admin can create super-admin accounts.' },
        { status: 403 }
      )
    }

    actorForAudit = actor.value
  }

  const user = await prisma.user.create({ data: body })

  await writeAuditLog({
    req,
    actor: actorForAudit,
    action: 'user.create',
    resource: 'user',
    resourceId: user.id,
    details: {
      role: user.role,
      name: user.name,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
