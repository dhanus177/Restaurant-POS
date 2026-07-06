import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetupStatus, validateActivationKey, validateSetupSecret } from '@/lib/setup'

type SetupBody = {
  setupSecret?: string
  activationKey?: string
  restaurant?: {
    restaurantName?: string
    address?: string
    phone?: string
    taxRate?: number
    currency?: string
    currencySymbol?: string
    receiptFooter?: string
    logo?: string
    requireCustomerBeforeOrder?: boolean
  }
  owner?: {
    name?: string
    pin?: string
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as SetupBody
  const setupCheck = validateSetupSecret(body.setupSecret ?? '')

  if (!setupCheck.ok) {
    return NextResponse.json({ error: setupCheck.reason }, { status: 403 })
  }

  const status = await getSetupStatus()

  if (status.setupComplete) {
    return NextResponse.json({ error: 'Setup is already complete for this instance.' }, { status: 409 })
  }

  if (!status.hasActiveLicense) {
    return NextResponse.json({ error: 'Activate a valid license before completing setup.' }, { status: 409 })
  }

  if (status.hasSettings || status.hasSuperAdmin) {
    return NextResponse.json({ error: 'This instance is already partially configured. Activation-only mode or manual cleanup is required.' }, { status: 409 })
  }

  const activationCheck = status.hasActiveLicense
    ? { ok: true as const, activationKey: undefined }
    : validateActivationKey(body.activationKey ?? '')

  if (!activationCheck.ok) {
    return NextResponse.json({ error: activationCheck.reason }, { status: 400 })
  }

  const restaurant = body.restaurant
  const owner = body.owner

  if (!restaurant?.restaurantName?.trim()) {
    return NextResponse.json({ error: 'Restaurant name is required.' }, { status: 400 })
  }

  if (!owner?.name?.trim()) {
    return NextResponse.json({ error: 'Super admin name is required.' }, { status: 400 })
  }

  if (!owner.pin || !/^\d{4}$/.test(owner.pin)) {
    return NextResponse.json({ error: 'Super admin PIN must be exactly 4 digits.' }, { status: 400 })
  }

  const restaurantName = restaurant.restaurantName.trim()
  const ownerName = owner.name.trim()
  const ownerPin = owner.pin

  const created = await prisma.$transaction(async (tx) => {
    if (!status.hasActiveLicense && activationCheck.activationKey) {
      await tx.license.upsert({
        where: { id: 'singleton' },
        update: {
          activationKey: activationCheck.activationKey,
          status: 'active',
          tier: 'standard',
          activatedAt: new Date(),
        },
        create: {
          id: 'singleton',
          activationKey: activationCheck.activationKey,
          status: 'active',
          tier: 'standard',
          activatedAt: new Date(),
        },
      })
    }

    const settings = await tx.settings.upsert({
      where: { id: 'singleton' },
      update: {
        restaurantName,
        address: restaurant.address?.trim() ?? '',
        phone: restaurant.phone?.trim() ?? '',
        taxRate: restaurant.taxRate ?? 0,
        currency: restaurant.currency?.trim() ?? 'LKR',
        currencySymbol: restaurant.currencySymbol?.trim() ?? 'Rs',
        receiptFooter: restaurant.receiptFooter?.trim() ?? 'Thank you for dining with us!',
        logo: restaurant.logo?.trim() || '',
        requireCustomerBeforeOrder: restaurant.requireCustomerBeforeOrder ?? false,
      },
      create: {
        id: 'singleton',
        restaurantName,
        address: restaurant.address?.trim() ?? '',
        phone: restaurant.phone?.trim() ?? '',
        taxRate: restaurant.taxRate ?? 0,
        currency: restaurant.currency?.trim() ?? 'LKR',
        currencySymbol: restaurant.currencySymbol?.trim() ?? 'Rs',
        receiptFooter: restaurant.receiptFooter?.trim() ?? 'Thank you for dining with us!',
        logo: restaurant.logo?.trim() || '',
        requireCustomerBeforeOrder: restaurant.requireCustomerBeforeOrder ?? false,
      },
    })

    const user = await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        name: ownerName,
        pin: ownerPin,
        role: 'super-admin',
      },
    })

    return { settings, user }
  })

  return NextResponse.json(
    {
      ok: true,
      settings: created.settings,
      owner: created.user,
      licenseActivated: !status.hasActiveLicense,
    },
    { status: 201 }
  )
}