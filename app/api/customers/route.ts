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

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
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
  return NextResponse.json(customers.map(toAppCustomer))
}

export async function POST(req: Request) {
  const body = await req.json()

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
  }

  const loyaltyPointsRaw = Number(body?.loyaltyPoints)
  const loyaltyPoints = Number.isFinite(loyaltyPointsRaw) ? Math.max(0, Math.floor(loyaltyPointsRaw)) : 0

  const customer = await prisma.customer.create({
    data: {
      name,
      phone: typeof body?.phone === 'string' && body.phone.trim() ? body.phone.trim() : null,
      email: typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : null,
      notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      loyaltyPoints,
    },
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

  return NextResponse.json(toAppCustomer(customer), { status: 201 })
}
