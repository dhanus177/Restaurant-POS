import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'

export async function GET() {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const users = await prisma.user.findMany()
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const existingUsersCount = await prisma.user.count()
  if (existingUsersCount > 0) {
    const actor = await requireRole(req, ['admin', 'super-admin'])
    if (!actor.ok) return actor.response
  }

  const body = await req.json()

  if (existingUsersCount > 0 && body?.role === 'super-admin') {
    const actor = await requireRole(req, ['super-admin'])
    if (!actor.ok) return actor.response
  }

  const user = await prisma.user.create({ data: body })
  return NextResponse.json(user, { status: 201 })
}
