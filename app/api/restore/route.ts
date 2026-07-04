import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { allowRestoreInProduction, isProduction, productionBlockResponse, requireActiveLicense, requireSuperAdmin } from '@/lib/server-guards'

type BackupPayload = {
  data?: {
    licenses?: any[]
    users?: any[]
    customers?: any[]
    categories?: any[]
    menuItems?: any[]
    modifierGroups?: any[]
    modifiers?: any[]
    tables?: any[]
    orders?: any[]
    orderItems?: any[]
    suppliers?: any[]
    supplierLedgerEntries?: any[]
    inventoryItems?: any[]
    cashDrawers?: any[]
    cashDrawerExpenses?: any[]
    cashDrawerReports?: any[]
    productRecipes?: any[]
    stockAdjustments?: any[]
    settings?: any[]
  }
}

export async function POST(req: Request) {
  if (isProduction() && !allowRestoreInProduction()) {
    return productionBlockResponse('Database restore')
  }

  const licenseError = await requireActiveLicense()
  if (licenseError) return licenseError

  const actor = await requireSuperAdmin(req)
  if (!actor.ok) return actor.response

  const body = (await req.json()) as BackupPayload
  const data = body?.data

  if (!data) {
    return NextResponse.json({ error: 'Invalid backup payload' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany()
    await tx.order.deleteMany()
    await tx.stockAdjustment.deleteMany()
    await tx.supplierLedgerEntry.deleteMany()
    await tx.productRecipe.deleteMany()
    await tx.modifier.deleteMany()
    await tx.modifierGroup.deleteMany()
    await tx.menuItem.deleteMany()
    await tx.category.deleteMany()
    await tx.inventoryItem.deleteMany()
    await tx.supplier.deleteMany()
    await tx.cashDrawer.deleteMany()
    await tx.cashDrawerExpense.deleteMany()
    await tx.cashDrawerReport.deleteMany()
    await tx.restaurantTable.deleteMany()
    await tx.user.deleteMany()
    await tx.customer.deleteMany()
    await tx.settings.deleteMany()
    await tx.license.deleteMany()

    if (data.licenses?.length) await tx.license.createMany({ data: data.licenses })
    if (data.users?.length) await tx.user.createMany({ data: data.users })
    if (data.customers?.length) await tx.customer.createMany({ data: data.customers })
    if (data.categories?.length) await tx.category.createMany({ data: data.categories })
    if (data.menuItems?.length) await tx.menuItem.createMany({ data: data.menuItems })
    if (data.modifierGroups?.length) await tx.modifierGroup.createMany({ data: data.modifierGroups })
    if (data.modifiers?.length) await tx.modifier.createMany({ data: data.modifiers })
    if (data.tables?.length) await tx.restaurantTable.createMany({ data: data.tables })
    if (data.orders?.length) await tx.order.createMany({ data: data.orders })
    if (data.orderItems?.length) await tx.orderItem.createMany({ data: data.orderItems })
    if (data.suppliers?.length) await tx.supplier.createMany({ data: data.suppliers })
    if (data.supplierLedgerEntries?.length) await tx.supplierLedgerEntry.createMany({ data: data.supplierLedgerEntries })
    if (data.inventoryItems?.length) await tx.inventoryItem.createMany({ data: data.inventoryItems })
    if (data.cashDrawers?.length) await tx.cashDrawer.createMany({ data: data.cashDrawers })
    if (data.cashDrawerExpenses?.length) await tx.cashDrawerExpense.createMany({ data: data.cashDrawerExpenses })
    if (data.cashDrawerReports?.length) await tx.cashDrawerReport.createMany({ data: data.cashDrawerReports })
    if (data.productRecipes?.length) await tx.productRecipe.createMany({ data: data.productRecipes })
    if (data.stockAdjustments?.length) await tx.stockAdjustment.createMany({ data: data.stockAdjustments })
    if (data.settings?.length) await tx.settings.createMany({ data: data.settings })
  })

  return NextResponse.json({ ok: true, restoredAt: new Date().toISOString() })
}
