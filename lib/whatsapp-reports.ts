import { prisma } from '@/lib/prisma'

type MealType = 'breakfast' | 'lunch' | 'dinner'

type MealSummary = {
  meal: MealType
  label: string
  start: Date
  end: Date
  orderCount: number
  totalSales: number
  cashSales: number
  cardSales: number
  topItems: Array<{ name: string; quantity: number }>
}

type DispatchResult = {
  meal: MealType
  sent: boolean
  reason?: string
  messageSid?: string
}

const DEFAULT_SEND_TIMES: Record<MealType, string> = {
  breakfast: '11:00',
  lunch: '16:00',
  dinner: '22:00',
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

function normalizePhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`
}

function normalizeMetaRecipient(value: string) {
  const raw = value.replace(/^whatsapp:/i, '').trim()
  const digits = raw.replace(/[^\d]/g, '')
  return digits
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  const source = (value ?? '').trim()
  const matched = source.match(/^(\d{2}):(\d{2})$/)
  if (!matched) return fallback
  const hours = Number(matched[1])
  const minutes = Number(matched[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function dayBounds(base = new Date()) {
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function mealBounds(base: Date, meal: MealType) {
  const startOfDay = new Date(base)
  startOfDay.setHours(0, 0, 0, 0)

  const make = (h: number, m: number) => {
    const d = new Date(startOfDay)
    d.setHours(h, m, 0, 0)
    return d
  }

  if (meal === 'breakfast') {
    return { start: make(5, 0), end: make(11, 0) }
  }

  if (meal === 'lunch') {
    return { start: make(11, 0), end: make(16, 0) }
  }

  return { start: make(16, 0), end: make(23, 59) }
}

function currentHHMM(now = new Date()) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

async function collectMealSummary(meal: MealType, baseDate: Date) {
  const { start, end } = mealBounds(baseDate, meal)

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
      paymentStatus: 'paid',
    },
    orderBy: { createdAt: 'asc' },
    select: {
      total: true,
      paymentMethod: true,
      items: {
        select: {
          name: true,
          quantity: true,
        },
      },
    },
  })

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
  const cashSales = orders
    .filter((order) => order.paymentMethod === 'cash')
    .reduce((sum, order) => sum + order.total, 0)
  const cardSales = orders
    .filter((order) => order.paymentMethod === 'card')
    .reduce((sum, order) => sum + order.total, 0)

  const itemMap = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.items) {
      itemMap.set(item.name, (itemMap.get(item.name) ?? 0) + item.quantity)
    }
  }

  const topItems = Array.from(itemMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({ name, quantity }))

  return {
    meal,
    label: MEAL_LABELS[meal],
    start,
    end,
    orderCount: orders.length,
    totalSales,
    cashSales,
    cardSales,
    topItems,
  } satisfies MealSummary
}

function formatCurrency(symbol: string, value: number) {
  return `${symbol}${value.toFixed(2)}`
}

function buildMessage(args: {
  restaurantName: string
  currencySymbol: string
  reportDate: Date
  summary: MealSummary
}) {
  const { restaurantName, currencySymbol, reportDate, summary } = args
  const dateText = reportDate.toLocaleDateString('en-CA')
  const period = `${summary.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}-${summary.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`

  const lines = [
    `📊 ${restaurantName} ${summary.label} Report`,
    `Date: ${dateText}`,
    `Period: ${period}`,
    `Orders: ${summary.orderCount}`,
    `Total Sales: ${formatCurrency(currencySymbol, summary.totalSales)}`,
    `Cash: ${formatCurrency(currencySymbol, summary.cashSales)}`,
    `Card: ${formatCurrency(currencySymbol, summary.cardSales)}`,
  ]

  if (summary.topItems.length > 0) {
    lines.push('Top Items:')
    summary.topItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} x${item.quantity}`)
    })
  }

  return lines.join('\n')
}

async function sendTwilioWhatsAppMessage(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio WhatsApp env vars are missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM).')
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const payload = new URLSearchParams({
    From: normalizePhone(from),
    To: normalizePhone(to),
    Body: body,
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null

  if (!response.ok) {
    throw new Error(data?.message || `Twilio request failed (${response.status})`)
  }

  return data?.sid
}

function hasMetaConfig() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
  )
}

function hasTwilioConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  )
}

async function sendMetaWhatsAppMessage(to: string, body: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp env vars are missing (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).')
  }

  const normalizedTo = normalizeMetaRecipient(to)
  if (!normalizedTo) {
    throw new Error('Recipient phone number is invalid for WhatsApp Cloud API.')
  }

  const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body },
    }),
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as
    | { messages?: Array<{ id?: string }>; error?: { message?: string } }
    | null

  if (!response.ok) {
    throw new Error(data?.error?.message || `WhatsApp Cloud API request failed (${response.status})`)
  }

  return data?.messages?.[0]?.id
}

async function sendWhatsAppMessage(to: string, body: string) {
  const provider = (process.env.WHATSAPP_PROVIDER || 'auto').toLowerCase()

  if (provider === 'meta') {
    return sendMetaWhatsAppMessage(to, body)
  }

  if (provider === 'twilio') {
    return sendTwilioWhatsAppMessage(to, body)
  }

  // auto mode: prefer Meta, then fallback to Twilio
  if (hasMetaConfig()) {
    return sendMetaWhatsAppMessage(to, body)
  }

  if (hasTwilioConfig()) {
    return sendTwilioWhatsAppMessage(to, body)
  }

  throw new Error(
    'WhatsApp provider config missing. Set Meta vars (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID) or Twilio vars.'
  )
}

export async function runWhatsAppReportScheduler(input?: { force?: boolean; meal?: MealType }) {
  const force = input?.force === true
  const targetMeal = input?.meal

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
  if (!settings) {
    return { sent: [] as DispatchResult[], skipped: [{ reason: 'Settings not found.' }] }
  }

  if (!settings.whatsappReportsEnabled && !force) {
    return { sent: [] as DispatchResult[], skipped: [{ reason: 'WhatsApp reports are disabled.' }] }
  }

  const recipient = normalizePhone(settings.whatsappRecipient ?? '')
  if (!recipient) {
    return { sent: [] as DispatchResult[], skipped: [{ reason: 'whatsappRecipient is not configured.' }] }
  }

  const sendTimes: Record<MealType, string> = {
    breakfast: normalizeTime(settings.whatsappBreakfastTime, DEFAULT_SEND_TIMES.breakfast),
    lunch: normalizeTime(settings.whatsappLunchTime, DEFAULT_SEND_TIMES.lunch),
    dinner: normalizeTime(settings.whatsappDinnerTime, DEFAULT_SEND_TIMES.dinner),
  }

  const now = new Date()
  const nowHHMM = currentHHMM(now)
  const { start: reportDate } = dayBounds(now)

  const meals: MealType[] = targetMeal ? [targetMeal] : ['breakfast', 'lunch', 'dinner']
  const dueMeals = force ? meals : meals.filter((meal) => sendTimes[meal] === nowHHMM)

  if (dueMeals.length === 0) {
    return {
      sent: [] as DispatchResult[],
      skipped: [{ reason: `No meal is due at ${nowHHMM}.` }],
    }
  }

  const sent: DispatchResult[] = []
  const skipped: Array<{ meal?: MealType; reason: string }> = []

  for (const meal of dueMeals) {
    const existing = await prisma.whatsAppReportDispatch.findUnique({
      where: {
        mealType_reportDate: {
          mealType: meal,
          reportDate,
        },
      },
    })

    if (existing) {
      skipped.push({ meal, reason: 'Already sent for today.' })
      continue
    }

    try {
      const summary = await collectMealSummary(meal, now)
      const message = buildMessage({
        restaurantName: settings.restaurantName,
        currencySymbol: settings.currencySymbol,
        reportDate,
        summary,
      })

      const messageSid = await sendWhatsAppMessage(recipient, message)

      await prisma.whatsAppReportDispatch.create({
        data: {
          mealType: meal,
          reportDate,
          messageSid: messageSid ?? null,
        },
      })

      sent.push({ meal, sent: true, messageSid })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown send failure'
      skipped.push({ meal, reason })
    }
  }

  return { sent, skipped }
}
