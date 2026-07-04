import { NextResponse } from 'next/server'
import { allowBackupInProduction, isProduction, productionBlockResponse, requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'
import { writeAuditLog } from '@/lib/audit-log'
import { buildFullBackupPayload, computeBackupChecksum, computePayloadSizeBytes } from '@/lib/backup'

export async function GET(req: Request) {
  if (isProduction() && !allowBackupInProduction()) {
    return productionBlockResponse('Database backup')
  }

  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const superAdmin = await requireSuperAdmin(req)
  if (!superAdmin.ok) return superAdmin.response

  const payload = await buildFullBackupPayload()
  const checksum = computeBackupChecksum(payload)
  const sizeBytes = computePayloadSizeBytes(payload)

  await writeAuditLog({
    req,
    actor: superAdmin.value,
    action: 'backup.export',
    resource: 'database',
    details: {
      version: payload.version,
      checksum,
      sizeBytes,
    },
  })

  return NextResponse.json({
    ...payload,
    checksum,
    sizeBytes,
  })
}
