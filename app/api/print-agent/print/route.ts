import { NextResponse } from 'next/server'

type PrintAgentPayload = {
  printerId: string
  data: string
  format?: 'raw'
  maxRetries?: number
}

const PRINT_AGENT_BASE_URL = (process.env.PRINT_AGENT_BASE_URL ?? 'http://127.0.0.1:5050/api').replace(/\/$/, '')
const PRINT_AGENT_ENABLED = (process.env.PRINT_AGENT_ENABLED ?? 'true').toLowerCase() !== 'false'

export async function POST(req: Request) {
  if (!PRINT_AGENT_ENABLED) {
    return NextResponse.json({ success: false, error: 'Print agent is disabled' }, { status: 503 })
  }

  let payload: PrintAgentPayload
  try {
    payload = (await req.json()) as PrintAgentPayload
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!payload?.printerId || !payload?.data) {
    return NextResponse.json({ success: false, error: 'printerId and data are required' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${PRINT_AGENT_BASE_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: payload.printerId,
        data: payload.data,
        format: payload.format ?? 'raw',
        maxRetries: payload.maxRetries ?? 3,
      }),
      cache: 'no-store',
    })

    const text = await upstream.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { success: upstream.ok, message: text }
      }
    }

    return NextResponse.json(body ?? { success: upstream.ok }, { status: upstream.status })
  } catch (error) {
    console.error('[print-agent proxy error]', error)
    return NextResponse.json({ success: false, error: 'Could not reach print agent service' }, { status: 502 })
  }
}
