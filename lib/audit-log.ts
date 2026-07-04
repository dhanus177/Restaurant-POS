import { prisma } from '@/lib/prisma'

type AuditActor = {
  id?: string
  name?: string
  role?: string
}

type AuditPayload = {
  req?: Request
  actor?: AuditActor
  action: string
  resource: string
  resourceId?: string
  details?: unknown
}

function getIpAddress(req?: Request) {
  if (!req) return null

  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return null
}

export async function writeAuditLog(payload: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        details: payload.details as any,
        actorId: payload.actor?.id,
        actorName: payload.actor?.name,
        actorRole: payload.actor?.role,
        ipAddress: getIpAddress(payload.req),
      },
    })
  } catch (error) {
    console.error('Failed to write audit log', error)
  }
}
