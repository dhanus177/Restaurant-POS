import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toAppCustomer(customer: any) {
  return {
    ...customer,
    lastOrderAt: customer.lastOrderAt ? customer.lastOrderAt.toISOString() : null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    recentOrders: Array.isArray(customer.orders)
      ? customer.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          paymentStatus: order.paymentStatus,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        }))
      : [],
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}

  if (typeof body?.name === 'string') {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }
    data.name = trimmed
  }

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'phone')) {
    data.phone = typeof body?.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
  }

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'email')) {
    data.email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : null
  }

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'notes')) {
    data.notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'loyaltyPoints')) {
    const raw = Number(body?.loyaltyPoints)
    if (!Number.isFinite(raw)) {
      return NextResponse.json({ error: 'Invalid loyalty points value' }, { status: 400 })
    }
    data.loyaltyPoints = Math.max(0, Math.floor(raw))
  }

  const customer = await prisma.customer.update({
    where: { id },
    data,
    include: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          paymentStatus: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      },
    },
  })

  return NextResponse.json(toAppCustomer(customer))
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.customer.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
