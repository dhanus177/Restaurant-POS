import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { normalizeRoleId } from '@/lib/roles'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'restaurant_pos_session'
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7) // 7 days
const SESSION_COOKIE_SECURE_OVERRIDE = (() => {
  const raw = process.env.SESSION_COOKIE_SECURE
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null
  }
  const normalized = raw.trim().toLowerCase()
  return !(normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off')
})()

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') return true
  if (/^10\./.test(lower)) return true
  if (/^192\.168\./.test(lower)) return true
  const m = lower.match(/^172\.(\d{1,3})\./)
  if (m) {
    const secondOctet = Number(m[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }
  return false
}

type SessionCookieSecureDecision = {
  secure: boolean
  reason: 'override' | 'https' | 'private-host' | 'production-fallback' | 'disabled'
  requestProtocol: string | null
  forwardedProto: string | null
  host: string | null
}

function resolveSessionCookieSecureDecision(req?: Request): SessionCookieSecureDecision {
  const forwardedProto = req?.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() ?? null
  let url: URL | null = null
  try {
    if (req?.url) {
      url = new URL(req.url)
    }
  } catch {
    // Ignore invalid URL and default to non-secure
  }

  return {
    secure: false,
    reason: 'disabled',
    requestProtocol: url?.protocol ?? null,
    forwardedProto,
    host: url?.host ?? null,
  }
}

function resolveSessionCookieSecure(req?: Request): boolean {
  return resolveSessionCookieSecureDecision(req).secure
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim().split('=').map((value) => decodeURIComponent(value)))
  )
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  return prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })
}

export async function getSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie')
  const cookies = parseCookies(cookieHeader)
  const token = typeof cookies[SESSION_COOKIE_NAME] === 'string' ? cookies[SESSION_COOKIE_NAME] : undefined
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: normalizeRoleId(session.user.role),
    },
  }
}

export function attachSessionCookie(res: NextResponse, token: string, req?: Request) {
  const secure = resolveSessionCookieSecure(req)
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

export function clearSessionCookie(res: NextResponse, req?: Request) {
  const secure = resolveSessionCookieSecure(req)
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}
