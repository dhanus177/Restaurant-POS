import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

type BackupData = {
  licenses: unknown[]
  sessions: unknown[]
  users: unknown[]
  customers: unknown[]
  categories: unknown[]
  menuItems: unknown[]
  modifierGroups: unknown[]
  modifiers: unknown[]
  tables: unknown[]
  orders: unknown[]
  orderItems: unknown[]
  suppliers: unknown[]
  supplierLedgerEntries: unknown[]
  inventoryItems: unknown[]
  cashDrawers: unknown[]
  cashDrawerExpenses: unknown[]
  cashDrawerReports: unknown[]
  shifts: unknown[]
  backupSchedules: unknown[]
  auditLogs: unknown[]
  productRecipes: unknown[]
  stockAdjustments: unknown[]
  settings: unknown[]
}

export type FullBackupPayload = {
  version: number
  exportedAt: string
  data: BackupData
}

export async function buildFullBackupPayload() {
  const exportedAt = new Date().toISOString()

  const [
    licenses,
    sessions,
    users,
    customers,
    categories,
    menuItems,
    modifierGroups,
    modifiers,
    tables,
    orders,
    orderItems,
    suppliers,
    supplierLedgerEntries,
    inventoryItems,
    cashDrawers,
    cashDrawerExpenses,
    cashDrawerReports,
    shifts,
    backupSchedules,
    auditLogs,
    productRecipes,
    stockAdjustments,
    settings,
  ] = await Promise.all([
    prisma.license.findMany(),
    prisma.session.findMany(),
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.category.findMany(),
    prisma.menuItem.findMany(),
    prisma.modifierGroup.findMany(),
    prisma.modifier.findMany(),
    prisma.restaurantTable.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.supplier.findMany(),
    prisma.supplierLedgerEntry.findMany(),
    prisma.inventoryItem.findMany(),
    prisma.cashDrawer.findMany(),
    prisma.cashDrawerExpense.findMany(),
    prisma.cashDrawerReport.findMany(),
    prisma.shift.findMany(),
    prisma.backupSchedule.findMany(),
    prisma.auditLog.findMany(),
    prisma.productRecipe.findMany(),
    prisma.stockAdjustment.findMany(),
    prisma.settings.findMany(),
  ])

  const payload: FullBackupPayload = {
    version: 3,
    exportedAt,
    data: {
      licenses,
      sessions,
      users,
      customers,
      categories,
      menuItems,
      modifierGroups,
      modifiers,
      tables,
      orders,
      orderItems,
      suppliers,
      supplierLedgerEntries,
      inventoryItems,
      cashDrawers,
      cashDrawerExpenses,
      cashDrawerReports,
      shifts,
      backupSchedules,
      auditLogs,
      productRecipes,
      stockAdjustments,
      settings,
    },
  }

  return payload
}

export function computeBackupChecksum(payload: FullBackupPayload) {
  const serialized = JSON.stringify(payload)
  return crypto.createHash('sha256').update(serialized).digest('hex')
}

export function computePayloadSizeBytes(payload: FullBackupPayload) {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8')
}
