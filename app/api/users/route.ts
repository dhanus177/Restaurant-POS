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

  if (body?.role === 'super-admin') {
    // Super-admin creation is privileged. During first-time bootstrap (no users yet),
    // setup flow should be used instead of /api/users.
    if (existingUsersCount === 0) {
      return NextResponse.json(
        { error: 'Initial super-admin account must be created through setup.' },
        { status: 403 }
      )
    }

    const superAdminActor = await requireRole(req, ['super-admin'])
    if (!superAdminActor.ok) {
      return NextResponse.json(
        { error: 'Only super admin can create super-admin accounts.' },
        { status: 403 }
      )
    }

    actorForAudit = superAdminActor.value
  }

  if (existingUsersCount > 0) {
    const actor = await requireRole(req, ['admin', 'super-admin'])
    if (!actor.ok) return actor.response
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
