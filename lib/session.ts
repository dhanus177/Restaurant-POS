import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { normalizeRoleId } from '@/lib/roles'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'restaurant_pos_session'
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7) // 7 days

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

export function attachSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}
