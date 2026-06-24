import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'

export async function GET() {
  try {
    const recipes = await prisma.productRecipe.findMany({
      include: {
        product: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true, sku: true, unit: true } },
      },
      orderBy: { product: { name: 'asc' } },
    })

    return NextResponse.json(
      recipes.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredient.name,
        ingredientSku: r.ingredient.sku,
        ingredientUnit: r.ingredient.unit,
        quantity: r.quantity,
      }))
    )
  } catch (error) {
    console.error('[product-recipes GET error]', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { productId, ingredientId, quantity } = body

    if (!productId || !ingredientId || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid productId, ingredientId, or quantity' },
        { status: 400 }
      )
    }

    // Check product exists
    const product = await prisma.menuItem.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check ingredient exists
    const ingredient = await prisma.inventoryItem.findUnique({ where: { id: ingredientId } })
    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    // Check if recipe already exists
    const existing = await prisma.productRecipe.findFirst({
      where: { productId, ingredientId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Recipe for this product-ingredient pair already exists' },
        { status: 409 }
      )
    }

    const recipe = await prisma.productRecipe.create({
      data: {
        id: randomUUID(),
        productId,
        ingredientId,
        quantity,
      },
      include: {
        product: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true, sku: true, unit: true } },
      },
    })

    return NextResponse.json(
      {
        id: recipe.id,
        productId: recipe.productId,
        productName: recipe.product.name,
        ingredientId: recipe.ingredientId,
        ingredientName: recipe.ingredient.name,
        ingredientSku: recipe.ingredient.sku,
        ingredientUnit: recipe.ingredient.unit,
        quantity: recipe.quantity,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[product-recipes POST error]', error)
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 })
  }
}
