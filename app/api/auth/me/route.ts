import { NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const { user } = session
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } }, { status: 200 })
}
