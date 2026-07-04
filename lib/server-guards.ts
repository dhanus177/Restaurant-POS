import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'

type GuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse }

export type ActorUser = {
  id: string
  role: string
  name: string
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

export function isEnabled(value: string | undefined, fallback = false) {
  if (value == null) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function allowSeedInProduction() {
  return isEnabled(process.env.ALLOW_SEED_IN_PRODUCTION, false)
}

export function allowRestoreInProduction() {
  return isEnabled(process.env.ALLOW_RESTORE_IN_PRODUCTION, false)
}

export function allowBackupInProduction() {
  return isEnabled(process.env.ALLOW_BACKUP_IN_PRODUCTION, true)
}

export function productionBlockResponse(operation: string) {
  return NextResponse.json(
    {
      error: `${operation} is disabled in production by default. Enable it explicitly via environment configuration if you really need it.`,
    },
    { status: 403 }
  )
}

export async function getLicenseStatus() {
  const license = await prisma.license.findFirst({ where: { id: 'singleton' } })

  if (!license) {
    return { ok: false as const, reason: 'Missing license activation.' }
  }

  if (license.status !== 'active') {
    return { ok: false as const, reason: `License is not active (${license.status}).` }
  }

  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: 'License is expired.' }
  }

  return { ok: true as const }
}

export async function requireActiveLicense() {
  const status = await getLicenseStatus()
  if (!status.ok) {
    return NextResponse.json({ error: status.reason }, { status: 403 })
  }

  return null
}

export async function authenticateActor(req: Request): Promise<GuardResult<ActorUser>> {
  const session = await getSessionFromRequest(req)

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true,
    value: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
    },
  }
}

export async function requireRole(req: Request, roles: string[]): Promise<GuardResult<ActorUser>> {
  const actor = await authenticateActor(req)
  if (!actor.ok) return actor

  if (!roles.includes(actor.value.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Insufficient permissions. Required role: ${roles.join(' or ')}.` },
        { status: 403 }
      ),
    }
  }

  return actor
}

export async function requireSuperAdmin(req: Request): Promise<GuardResult<ActorUser>> {
  return requireRole(req, ['super-admin'])
}

