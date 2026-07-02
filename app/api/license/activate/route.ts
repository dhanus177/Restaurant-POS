import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateActivationKey, validateSetupSecret } from '@/lib/setup'

type ActivationBody = {
  setupSecret?: string
  activationKey?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as ActivationBody
  const setupCheck = validateSetupSecret(body.setupSecret ?? '')

  if (!setupCheck.ok) {
    return NextResponse.json({ error: setupCheck.reason }, { status: 403 })
  }

  const activationCheck = validateActivationKey(body.activationKey ?? '')

  if (!activationCheck.ok) {
    return NextResponse.json({ error: activationCheck.reason }, { status: 400 })
  }

  const existingLicense = await prisma.license.findUnique({ where: { id: 'singleton' } })

  if (existingLicense?.status === 'active' && existingLicense.activationKey !== activationCheck.activationKey) {
    return NextResponse.json({ error: 'This instance is already activated with a different license key.' }, { status: 409 })
  }

  const license = await prisma.license.upsert({
    where: { id: 'singleton' },
    update: {
      activationKey: activationCheck.activationKey,
      status: 'active',
      tier: existingLicense?.tier ?? 'standard',
      activatedAt: existingLicense?.activatedAt ?? new Date(),
    },
    create: {
      id: 'singleton',
      activationKey: activationCheck.activationKey,
      status: 'active',
      tier: 'standard',
      activatedAt: new Date(),
    },
  })

  return NextResponse.json({
    ok: true,
    license: {
      status: license.status,
      tier: license.tier,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
    },
  })
}