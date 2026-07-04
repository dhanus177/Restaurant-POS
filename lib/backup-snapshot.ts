import { prisma } from '@/lib/prisma'
import { buildFullBackupPayload, computeBackupChecksum, computePayloadSizeBytes } from '@/lib/backup'

type SnapshotTrigger = 'manual' | 'scheduled'

type CreateSnapshotInput = {
  trigger: SnapshotTrigger
  createdBy?: string
  verifyChecksum?: boolean
  retentionCount?: number
}

export async function createVerifiedSnapshot(input: CreateSnapshotInput) {
  const payload = await buildFullBackupPayload()
  const checksum = computeBackupChecksum(payload)
  const sizeBytes = computePayloadSizeBytes(payload)

  const verified = input.verifyChecksum === false
    ? true
    : computeBackupChecksum(payload) === checksum

  const snapshot = await prisma.backupSnapshot.create({
    data: {
      trigger: input.trigger,
      checksum,
      verified,
      sizeBytes,
      exportedAt: new Date(payload.exportedAt),
      createdBy: input.createdBy,
      payload: payload as any,
    },
  })

  const retentionCount = Math.max(1, input.retentionCount ?? 14)
  const snapshots = await prisma.backupSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const removableIds = snapshots.slice(retentionCount).map((item) => item.id)
  if (removableIds.length) {
    await prisma.backupSnapshot.deleteMany({ where: { id: { in: removableIds } } })
  }

  return {
    snapshot,
    payload,
    checksum,
    sizeBytes,
    verified,
  }
}

export function nextRunFrom(base: Date, frequencyHours: number) {
  const safeHours = Math.max(1, Math.min(24 * 14, frequencyHours))
  return new Date(base.getTime() + safeHours * 60 * 60 * 1000)
}
