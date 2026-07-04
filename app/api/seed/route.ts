import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  mockUsers,
  mockCustomers,
  mockCategories,
  mockMenuItems,
  mockTables,
  mockOrders,
  mockInventory,
  mockSettings,
  mockSuppliers,
  mockProductRecipes,
} from '@/lib/mock-data'
import { allowSeedInProduction, isProduction, productionBlockResponse } from '@/lib/server-guards'

export async function POST(req: Request) {
  try {
    if (isProduction() && !allowSeedInProduction()) {
      return productionBlockResponse('Database seeding')
    }

    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true'

    if (force) {
      await prisma.$transaction([
        prisma.license.deleteMany(),
        prisma.stockAdjustment.deleteMany(),
        prisma.supplierLedgerEntry.deleteMany(),
        prisma.productRecipe.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.modifier.deleteMany(),
        prisma.modifierGroup.deleteMany(),
        prisma.menuItem.deleteMany(),
        prisma.restaurantTable.deleteMany(),
        prisma.inventoryItem.deleteMany(),
        prisma.supplier.deleteMany(),
        prisma.cashDrawer.deleteMany(),
        prisma.cashDrawerExpense.deleteMany(),
        prisma.cashDrawerReport.deleteMany(),
        prisma.category.deleteMany(),
        prisma.user.deleteMany(),
        prisma.customer.deleteMany(),
        prisma.settings.deleteMany(),
      ])
    }

    // Only seed if the DB is empty (idempotent)
    const [userCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
    ])

    if (userCount > 0 || categoryCount > 0) {
      return NextResponse.json({ message: 'Database already seeded', skipped: true })
    }

    // Users
    await prisma.user.createMany({ data: mockUsers })

    // Customers
    await prisma.customer.createMany({ data: mockCustomers })

    // Categories
    await prisma.category.createMany({ data: mockCategories })

    // Menu items with modifier groups and modifiers
    for (const item of mockMenuItems) {
      const { modifierGroups, ...itemData } = item
      await prisma.menuItem.create({
        data: {
          ...itemData,
          modifierGroups: modifierGroups?.length
            ? {
                create: modifierGroups.map((mg) => ({
                  id: mg.id,
                  name: mg.name,
                  required: mg.required,
                  maxSelections: mg.maxSelections,
                  modifiers: {
                    create: mg.modifiers.map((m) => ({
                      id: m.id,
                      name: m.name,
                      price: m.price,
                    })),
                  },
                })),
              }
            : undefined,
        },
      })
    }

    // Tables
    await prisma.restaurantTable.createMany({ data: mockTables })

    // Suppliers
    await prisma.supplier.createMany({ data: mockSuppliers })

    // Inventory
    await prisma.inventoryItem.createMany({
      data: mockInventory.map(({ lastRestocked, ...i }) => ({
        ...i,
        lastRestocked: lastRestocked ? new Date(lastRestocked) : null,
      })),
    })

    // Product recipes
    await prisma.productRecipe.createMany({ data: mockProductRecipes })

    // Orders
    for (const order of mockOrders) {
      const { items, createdAt, updatedAt, ...orderData } = order
      await prisma.order.create({
        data: {
          ...orderData,
          createdAt: new Date(createdAt),
          items: {
            create: items.map((item) => ({
              id: item.id,
              menuItemId: item.menuItemId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              modifiers: item.modifiers as unknown as Prisma.InputJsonValue,
              notes: item.notes ?? null,
            })),
          },
        },
      })
    }

    // Settings
    await prisma.settings.create({ data: { id: 'singleton', ...mockSettings, logo: mockSettings.logo ?? '' } })

    // Cash drawer
    await prisma.cashDrawer.create({
      data: {
        id: 'singleton',
        openingBalance: 0,
        notes: 'Initial drawer balance',
        openedAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Database seeded successfully', force })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
