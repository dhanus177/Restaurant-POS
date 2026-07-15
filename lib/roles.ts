import type { BuiltInRole, RoleDefinition, Settings } from './types'

export const SYSTEM_ROLE_DEFINITIONS: RoleDefinition[] = [
  { id: 'super-admin', name: 'Super Admin', baseRole: 'super-admin', system: true },
  { id: 'admin', name: 'Admin', baseRole: 'admin', system: true },
  { id: 'cashier', name: 'Cashier', baseRole: 'cashier', system: true },
  { id: 'kitchen', name: 'Kitchen', baseRole: 'kitchen', system: true },
  { id: 'pay-counter', name: 'Pay Counter', baseRole: 'pay-counter', system: true },
  { id: 'takeaway', name: 'Takeaway', baseRole: 'takeaway', system: true },
  { id: 'waiter', name: 'Waiter', baseRole: 'waiter', system: true },
]

export function getAllRoleDefinitions(settings?: Pick<Settings, 'customRoles'> | null): RoleDefinition[] {
  return [...SYSTEM_ROLE_DEFINITIONS, ...(settings?.customRoles ?? [])]
}

export function getRoleDefinition(roleId: string, settings?: Pick<Settings, 'customRoles'> | null): RoleDefinition | undefined {
  return getAllRoleDefinitions(settings).find((role) => role.id === roleId)
}

export function getRoleDisplayName(roleId: string, settings?: Pick<Settings, 'customRoles'> | null): string {
  return getRoleDefinition(roleId, settings)?.name ?? roleId
}

export function resolveEffectiveRole(roleId: string, settings?: Pick<Settings, 'customRoles'> | null): BuiltInRole | null {
  const definition = getRoleDefinition(roleId, settings)
  return definition?.baseRole ?? null
}

export function hasEffectiveRole(roleId: string, allowedRoles: BuiltInRole[], settings?: Pick<Settings, 'customRoles'> | null): boolean {
  const effectiveRole = resolveEffectiveRole(roleId, settings)
  return effectiveRole ? allowedRoles.includes(effectiveRole) : false
}

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}