import { NextResponse } from 'next/server'
import { getPrintAgentEndpointCandidates } from '@/lib/print-agent'

type PrintAgentPayload = {
  printerId: string
  printerName?: string
  data: string
  format?: 'raw'
  maxRetries?: number
}

const PRINT_AGENT_BASE_URL = process.env.PRINT_AGENT_BASE_URL ?? 'http://localhost:5050'
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
    const endpoints = getPrintAgentEndpointCandidates(PRINT_AGENT_BASE_URL, '/print')
    let upstream: Response | null = null

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerId: payload.printerId,
            printerName: payload.printerName ?? payload.printerId,
            data: payload.data,
            format: payload.format ?? 'raw',
            maxRetries: payload.maxRetries ?? 3,
          }),
          cache: 'no-store',
        })

        upstream = response
        if (response.ok) break
      } catch (error) {
        console.error('[print-agent proxy retry failed]', endpoint, error)
      }
    }

    if (!upstream) {
      return NextResponse.json({ success: false, error: 'Could not reach print agent service' }, { status: 502 })
    }

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
