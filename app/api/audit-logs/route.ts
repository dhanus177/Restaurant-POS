import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireRole } from '@/lib/server-guards'
import type { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireRole(req, ['admin', 'super-admin'])
  if (!actor.ok) return actor.response

  const { searchParams } = new URL(req.url)

  const action = searchParams.get('action')?.trim() || undefined
  const resource = searchParams.get('resource')?.trim() || undefined
  const actorRole = searchParams.get('actorRole')?.trim() || undefined
  const query = searchParams.get('query')?.trim() || undefined

  const limitParam = Number(searchParams.get('limit') ?? '200')
  const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200

  const dateFromRaw = searchParams.get('dateFrom')
  const dateToRaw = searchParams.get('dateTo')

  const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null
  const dateTo = dateToRaw ? new Date(dateToRaw) : null

  const where: Prisma.AuditLogWhereInput = {}

  if (action) where.action = action
  if (resource) where.resource = resource
  if (actorRole) where.actorRole = actorRole

  if ((dateFrom && !Number.isNaN(dateFrom.getTime())) || (dateTo && !Number.isNaN(dateTo.getTime()))) {
    where.createdAt = {}
    if (dateFrom && !Number.isNaN(dateFrom.getTime())) where.createdAt.gte = dateFrom
    if (dateTo && !Number.isNaN(dateTo.getTime())) where.createdAt.lte = dateTo
  }

  if (query) {
    where.OR = [
      { action: { contains: query, mode: 'insensitive' } },
      { resource: { contains: query, mode: 'insensitive' } },
      { resourceId: { contains: query, mode: 'insensitive' } },
      { actorName: { contains: query, mode: 'insensitive' } },
      { actorId: { contains: query, mode: 'insensitive' } },
      { actorRole: { contains: query, mode: 'insensitive' } },
    ]
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  })

  return NextResponse.json(
    logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }))
  )
}
