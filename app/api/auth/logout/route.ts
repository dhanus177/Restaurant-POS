import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest, clearSessionCookie } from '@/lib/session'

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req)
  if (session) {
    await prisma.session.delete({ where: { id: session.id } })
  }

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response, req)
  return response
}
