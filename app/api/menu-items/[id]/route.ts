import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { modifierGroups, ...rest } = body

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
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.menuItem.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
