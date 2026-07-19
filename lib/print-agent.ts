const DEFAULT_PRINT_AGENT_BASE_URL = 'http://localhost:5050'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function withLoopbackAliases(baseUrl: string): string[] {
  const aliases = [baseUrl]

  if (baseUrl.includes('localhost')) {
    aliases.push(baseUrl.replace('localhost', '127.0.0.1'))
    aliases.push(baseUrl.replace('localhost', '[::1]'))
  } else if (baseUrl.includes('127.0.0.1')) {
    aliases.push(baseUrl.replace('127.0.0.1', 'localhost'))
    aliases.push(baseUrl.replace('127.0.0.1', '[::1]'))
  } else if (baseUrl.includes('[::1]')) {
    aliases.push(baseUrl.replace('[::1]', 'localhost'))
    aliases.push(baseUrl.replace('[::1]', '127.0.0.1'))
  }

  return unique(aliases)
}

export function parsePrintAgentSourceUrls(input: string): string[] {
  return unique(
    input
      .split(/[\n,]/g)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => trimTrailingSlash(value))
  )
}

export function getPrintAgentBaseCandidates(baseUrl?: string | null): string[] {
  const rawBase = trimTrailingSlash((baseUrl ?? DEFAULT_PRINT_AGENT_BASE_URL).trim() || DEFAULT_PRINT_AGENT_BASE_URL)

  const candidates: string[] = []

  for (const alias of withLoopbackAliases(rawBase)) {
    candidates.push(alias)

    if (alias.endsWith('/api/v1')) {
      candidates.push(alias.replace(/\/api\/v1$/, '/api'))
    } else if (alias.endsWith('/api')) {
      candidates.push(`${alias}/v1`)
    } else {
      candidates.push(`${alias}/api/v1`)
      candidates.push(`${alias}/api`)
    }
  }

  return unique(candidates)
}

export function getPrintAgentEndpointCandidates(baseUrl: string, endpointPath: string): string[] {
  const path = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`
  return getPrintAgentBaseCandidates(baseUrl).map((candidate) => `${candidate}${path}`)
}
