import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, attachSessionCookie } from '@/lib/session'

export async function POST(req: Request) {
  const { pin } = await req.json()
  if (!pin || typeof pin !== 'string') {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({ where: { pin } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const session = await createSession(user.id)
  const response = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } })
  attachSessionCookie(response, session.token)
  return response
}
