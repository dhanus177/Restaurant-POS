import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { quantity } = body

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const recipe = await prisma.productRecipe.update({
      where: { id },
      data: { quantity },
      include: {
        product: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true, sku: true, unit: true } },
      },
    })

    return NextResponse.json({
      id: recipe.id,
      productId: recipe.productId,
      productName: recipe.product.name,
      ingredientId: recipe.ingredientId,
      ingredientName: recipe.ingredient.name,
      ingredientSku: recipe.ingredient.sku,
      ingredientUnit: recipe.ingredient.unit,
      quantity: recipe.quantity,
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    console.error('[product-recipes PATCH error]', error)
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.productRecipe.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    console.error('[product-recipes DELETE error]', error)
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
  }
}
