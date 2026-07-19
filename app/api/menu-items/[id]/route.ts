import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { modifierGroups, ...rest } = body

    if (Object.prototype.hasOwnProperty.call(rest, 'categoryId')) {
      if (typeof rest.categoryId !== 'string' || !rest.categoryId.trim()) {
        return NextResponse.json({ error: 'A valid category is required for menu items.' }, { status: 400 })
      }

      const category = await prisma.category.findUnique({
        where: { id: rest.categoryId },
        select: { id: true },
      })

      if (!category) {
        return NextResponse.json({ error: 'Selected category does not exist. Please pick a valid category.' }, { status: 400 })
      }
    }

    // Update scalar fields
    await prisma.menuItem.update({ where: { id }, data: rest })

    // Replace modifier groups if provided
    if (modifierGroups !== undefined) {
      // Delete existing groups (cascades to modifiers)
      await prisma.modifierGroup.deleteMany({ where: { menuItemId: id } })
      if (modifierGroups.length) {
        await prisma.modifierGroup.createMany({
          data: modifierGroups.map((mg: any) => ({
            id: mg.id,
            name: mg.name,
            required: mg.required,
            maxSelections: mg.maxSelections,
            menuItemId: id,
          })),
        })
        for (const mg of modifierGroups) {
          await prisma.modifier.createMany({
            data: mg.modifiers.map((m: any) => ({
              id: m.id,
              name: m.name,
              price: m.price,
              modifierGroupId: mg.id,
            })),
          })
        }
      }
    }

    const updated = await prisma.menuItem.findUnique({
      where: { id },
      include: { modifierGroups: { include: { modifiers: true } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const isMissingColumn =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022'

    const isForeignKeyError =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'

    if (isForeignKeyError) {
      return NextResponse.json(
        {
          error:
            'Selected category is invalid or missing. Create the category first, then try saving the menu item again.',
        },
        { status: 400 }
      )
    }

    if (isMissingColumn) {
      return NextResponse.json(
        {
          error:
            'Database is missing the latest menu item columns. Run prisma migrate deploy (or redeploy containers) and try again.',
        },
        { status: 500 }
      )
    }

    console.error('[menu-items.patch error]', error)
    return NextResponse.json({ error: 'Failed to update menu item.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.menuItem.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
