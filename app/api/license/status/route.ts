import { NextResponse } from 'next/server'
import { getLicenseStatus } from '@/lib/server-guards'

export async function GET() {
  const status = await getLicenseStatus()

  if (!status.ok) {
    return NextResponse.json({ active: false, reason: status.reason }, { status: 200 })
  }

  return NextResponse.json({ active: true }, { status: 200 })
}