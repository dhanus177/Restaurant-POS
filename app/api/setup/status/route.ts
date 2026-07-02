import { NextResponse } from 'next/server'
import { getSetupStatus } from '@/lib/setup'

export async function GET() {
  const status = await getSetupStatus()
  return NextResponse.json(status)
}