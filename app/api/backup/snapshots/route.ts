import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'
import { createVerifiedSnapshot } from '@/lib/backup-snapshot'
import { writeAuditLog } from '@/lib/audit-log'

function toSnapshotMeta(snapshot: {
  id: string
  trigger: string
  checksum: string
  verified: boolean
  sizeBytes: number
  exportedAt: Date
  createdBy: string | null
  createdAt: Date
}) {
  return {
    ...snapshot,
    exportedAt: snapshot.exportedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
  }
}

export async function GET(req: Request) {
  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  const snapshots = await prisma.backupSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(snapshots.map(toSnapshotMeta))
}

export async function POST(req: Request) {
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

  const created = await createVerifiedSnapshot({
    trigger: 'manual',
    createdBy: actor.value.id,
    verifyChecksum: schedule.verifyChecksum,
    retentionCount: schedule.retentionCount,
  })

  await prisma.backupSchedule.update({
    where: { id: 'singleton' },
    data: {
      lastRunAt: created.snapshot.createdAt,
    },
  })

  await writeAuditLog({
    req,
    actor: actor.value,
    action: 'backup.snapshot.manual',
    resource: 'backup_snapshot',
    resourceId: created.snapshot.id,
    details: {
      checksum: created.checksum,
      verified: created.verified,
      sizeBytes: created.sizeBytes,
    },
  })

  return NextResponse.json(toSnapshotMeta(created.snapshot), { status: 201 })
}
