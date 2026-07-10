import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'
import { writeAuditLog } from '@/lib/audit-log'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin'])
  if (!actor.ok) return actor.response

  const { id } = await params
  const body = await req.json()

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const nextRole = typeof body?.role === 'string' ? body.role : existingUser.role
  if ((existingUser.role === 'super-admin' || nextRole === 'super-admin') && actor.value.role !== 'super-admin') {
    return NextResponse.json({ error: 'Only super admin can edit super-admin users or promote accounts to super-admin.' }, { status: 403 })
  }

  const user = await prisma.user.update({ where: { id }, data: body })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'user.update',
    resource: 'user',
    resourceId: user.id,
    details: {
      before: {
        name: existingUser.name,
        role: existingUser.role,
      },
      after: {
        name: user.name,
        role: user.role,
      },
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin'])
  if (!actor.ok) return actor.response

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (existingUser.role === 'super-admin' && actor.value.role !== 'super-admin') {
    return NextResponse.json({ error: 'Only super admin can delete super-admin users.' }, { status: 403 })
  }

  await prisma.user.delete({ where: { id } })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'user.delete',
    resource: 'user',
    resourceId: existingUser.id,
    details: {
      name: existingUser.name,
      role: existingUser.role,
    },
  })

  return new NextResponse(null, { status: 204 })
}
