import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toAppMenuItem(item: any) {
  return {
    ...item,
    modifierGroups: item.modifierGroups?.map((mg: any) => ({
      ...mg,
      modifiers: mg.modifiers,
    })),
  }
}

export async function GET() {
  const items = await prisma.menuItem.findMany({
    include: { modifierGroups: { include: { modifiers: true } } },
  })
  return NextResponse.json(items.map(toAppMenuItem))
}

export async function POST(req: Request) {
  const body = await req.json()
  const { modifierGroups, ...rest } = body
  const item = await prisma.menuItem.create({
    data: {
      ...rest,
      modifierGroups: modifierGroups?.length
        ? {
            create: modifierGroups.map((mg: any) => ({
              id: mg.id,
              name: mg.name,
              required: mg.required,
              maxSelections: mg.maxSelections,
              modifiers: {
                create: mg.modifiers.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  price: m.price,
                })),
              },
            })),
          }
        : undefined,
    },
    include: { modifierGroups: { include: { modifiers: true } } },
  })
  return NextResponse.json(toAppMenuItem(item), { status: 201 })
}
