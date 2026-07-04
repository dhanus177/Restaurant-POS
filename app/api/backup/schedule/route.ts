import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'
import { createVerifiedSnapshot, nextRunFrom } from '@/lib/backup-snapshot'
import { writeAuditLog } from '@/lib/audit-log'

function toSchedule(schedule: {
  id: string
  enabled: boolean
  frequencyHours: number
  retentionCount: number
  verifyChecksum: boolean
  lastRunAt: Date | null
  nextRunAt: Date | null
  updatedAt: Date
}) {
  return {
    ...schedule,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    updatedAt: schedule.updatedAt.toISOString(),
  }
}

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  const schedule = await prisma.backupSchedule.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      enabled: false,
      frequencyHours: 24,
      retentionCount: 14,
      verifyChecksum: true,
    },
  })

  return NextResponse.json(toSchedule(schedule))
}

export async function PATCH(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  const body = await req.json()

  const enabled = typeof body?.enabled === 'boolean' ? body.enabled : undefined
  const frequencyHours = Number(body?.frequencyHours)
  const retentionCount = Number(body?.retentionCount)
  const verifyChecksum = typeof body?.verifyChecksum === 'boolean' ? body.verifyChecksum : undefined

  const existing = await prisma.backupSchedule.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      enabled: false,
      frequencyHours: 24,
      retentionCount: 14,
      verifyChecksum: true,
    },
  })

  const nextEnabled = enabled ?? existing.enabled
  const nextFrequency = Number.isFinite(frequencyHours) ? Math.max(1, Math.min(24 * 14, Math.floor(frequencyHours))) : existing.frequencyHours
  const nextRetention = Number.isFinite(retentionCount) ? Math.max(1, Math.min(120, Math.floor(retentionCount))) : existing.retentionCount
  const nextVerify = verifyChecksum ?? existing.verifyChecksum

  const now = new Date()
  const updated = await prisma.backupSchedule.update({
    where: { id: 'singleton' },
    data: {
      enabled: nextEnabled,
      frequencyHours: nextFrequency,
      retentionCount: nextRetention,
      verifyChecksum: nextVerify,
      nextRunAt: nextEnabled ? (existing.nextRunAt && existing.nextRunAt > now ? existing.nextRunAt : nextRunFrom(now, nextFrequency)) : null,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'backup.schedule.update',
    resource: 'backup_schedule',
    resourceId: updated.id,
    details: {
      enabled: updated.enabled,
      frequencyHours: updated.frequencyHours,
      retentionCount: updated.retentionCount,
      verifyChecksum: updated.verifyChecksum,
      nextRunAt: updated.nextRunAt?.toISOString() ?? null,
    },
  })

  return NextResponse.json(toSchedule(updated))
}

export async function POST(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  const body = await req.json().catch(() => ({}))
  const force = body?.force === true

  const schedule = await prisma.backupSchedule.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      enabled: false,
      frequencyHours: 24,
      retentionCount: 14,
      verifyChecksum: true,
    },
  })

  const now = new Date()
  const due = schedule.enabled && (!schedule.nextRunAt || schedule.nextRunAt <= now)

  if (!force && !due) {
    return NextResponse.json({
      ran: false,
      reason: 'Not due yet',
      schedule: toSchedule(schedule),
    })
  }

  const created = await createVerifiedSnapshot({
    trigger: 'scheduled',
    createdBy: actor.value.id,
    verifyChecksum: schedule.verifyChecksum,
    retentionCount: schedule.retentionCount,
  })

  const updatedSchedule = await prisma.backupSchedule.update({
    where: { id: 'singleton' },
    data: {
      lastRunAt: created.snapshot.createdAt,
      nextRunAt: schedule.enabled ? nextRunFrom(created.snapshot.createdAt, schedule.frequencyHours) : null,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'backup.snapshot.scheduled',
    resource: 'backup_snapshot',
    resourceId: created.snapshot.id,
    details: {
      checksum: created.checksum,
      verified: created.verified,
      sizeBytes: created.sizeBytes,
      forced: force,
    },
  })

  return NextResponse.json({
    ran: true,
    snapshotId: created.snapshot.id,
    schedule: toSchedule(updatedSchedule),
  })
}
