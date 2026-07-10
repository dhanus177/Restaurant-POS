import { prisma } from '@/lib/prisma'

export type SetupStatus = {
  hasSettings: boolean
  hasSuperAdmin: boolean
  hasActiveLicense: boolean
  setupComplete: boolean
  requiresActivationOnly: boolean
  isPartiallyConfigured: boolean
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const [settings, superAdminCount, activeLicense] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'singleton' } }),
    prisma.user.count({ where: { role: 'super-admin' } }),
    prisma.license.findFirst({ where: { status: 'active' } }),
  ])

  const hasSettings = Boolean(settings)
  const hasSuperAdmin = superAdminCount > 0
  const hasActiveLicense = Boolean(activeLicense)
  const setupComplete = hasSettings && hasSuperAdmin && hasActiveLicense
  const requiresActivationOnly = hasSettings && hasSuperAdmin && !hasActiveLicense
  const isPartiallyConfigured = (hasSettings || hasSuperAdmin) && !setupComplete && !requiresActivationOnly

  return {
    hasSettings,
    hasSuperAdmin,
    hasActiveLicense,
    setupComplete,
    requiresActivationOnly,
    isPartiallyConfigured,
  }
}

export function getAllowedActivationKeys() {
  return (process.env.LICENSE_ACTIVATION_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

export function validateActivationKey(key: string) {
  const activationKey = key.trim()
  const allowedKeys = getAllowedActivationKeys()

  if (allowedKeys.length === 0) {
    return { ok: false as const, reason: 'No activation keys are configured on the server.' }
  }

  if (!activationKey) {
    return { ok: false as const, reason: 'Activation key is required.' }
  }

  if (!allowedKeys.includes(activationKey)) {
    return { ok: false as const, reason: 'Activation key is invalid.' }
  }

  return { ok: true as const, activationKey }
}