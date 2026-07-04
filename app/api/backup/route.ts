import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { allowBackupInProduction, isProduction, productionBlockResponse, requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'

export async function GET(req: Request) {
  if (isProduction() && !allowBackupInProduction()) {
    return productionBlockResponse('Database backup')
  }

  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const superAdmin = await requireSuperAdmin(req)
  if (!superAdmin.ok) return superAdmin.response

  const [
    licenses,
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
    productRecipes,
    stockAdjustments,
    settings,
  ] = await Promise.all([
    prisma.license.findMany(),
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
    prisma.productRecipe.findMany(),
    prisma.stockAdjustment.findMany(),
    prisma.settings.findMany(),
  ])

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      licenses,
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
      productRecipes,
      stockAdjustments,
      settings,
    },
  })
}
