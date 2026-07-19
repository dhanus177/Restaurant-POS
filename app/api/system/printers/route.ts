import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getPrintAgentEndpointCandidates } from '@/lib/print-agent'

const execAsync = promisify(exec)
const PRINT_AGENT_BASE_URL = process.env.PRINT_AGENT_BASE_URL ?? 'http://localhost:5050'
const PRINT_AGENT_ENABLED = (process.env.PRINT_AGENT_ENABLED ?? 'true').toLowerCase() !== 'false'

type AgentPrinter = {
  id?: string
  name?: string
}

async function getWindowsPrinters(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"',
      { timeout: 5000 }
    )
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch (error) {
    console.error('Failed to get Windows printers:', error)
    return []
  }
}

async function getMacPrinters(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('lpstat -p -d', { timeout: 5000 })
    return stdout
      .split('\n')
      .map((line) => line.replace(/^printer\s+/, '').split(/\s+/)[0])
      .filter((line) => line.length > 0)
  } catch (error) {
    console.error('Failed to get Mac printers:', error)
    return []
  }
}

async function getLinuxPrinters(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('lpstat -p -d', { timeout: 5000 })
    return stdout
      .split('\n')
      .map((line) => line.replace(/^printer\s+/, '').split(/\s+/)[0])
      .filter((line) => line.length > 0)
  } catch (error) {
    console.error('Failed to get Linux printers:', error)
    return []
  }
}

async function getPrintAgentPrinters(): Promise<string[]> {
  if (!PRINT_AGENT_ENABLED) return []

  try {
    const endpoints = getPrintAgentEndpointCandidates(PRINT_AGENT_BASE_URL, '/printers')

    for (const endpoint of endpoints) {
      const upstream = await fetch(endpoint, { cache: 'no-store' })
      if (!upstream.ok) {
        continue
      }

      const text = await upstream.text()
      let payload: unknown = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = null
        }
      }

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.data)
          ? (payload as any).data
          : []

      return (rows as AgentPrinter[])
        .map((printer) => printer.id || printer.name)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    }
  } catch (error) {
    console.error('[system printers proxy error]', error)
    return []
  }
}

export async function GET() {
  try {
    let printers: string[] = await getPrintAgentPrinters()

    if (printers.length > 0) {
      return NextResponse.json({ printers, platform: process.platform, source: 'print-agent' })
    }

    if (process.platform === 'win32') {
      printers = await getWindowsPrinters()
    } else if (process.platform === 'darwin') {
      printers = await getMacPrinters()
    } else if (process.platform === 'linux') {
      printers = await getLinuxPrinters()
    }

    return NextResponse.json({ printers, platform: process.platform, source: 'system' })
  } catch (error) {
    console.error('Error fetching printers:', error)
    return NextResponse.json({ printers: [], platform: process.platform, error: 'Failed to fetch printers' }, { status: 500 })
  }
}
