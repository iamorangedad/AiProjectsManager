export type LlmProfile = {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

const KEY = 'llm_profiles'

declare const chrome: {
  storage?: {
    local?: {
      get: (keys: string[], cb: (r: Record<string, unknown>) => void) => void
      set: (v: Record<string, unknown>, cb?: () => void) => void
    }
  }
  runtime?: { lastError?: { message?: string } }
  permissions?: {
    contains: (p: { origins: string[] }, cb: (ok: boolean) => void) => void
    request: (p: { origins: string[] }, cb: (ok: boolean) => void) => void
  }
}

function hasChromeLocal() {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}

export function normalizeProfiles(value: unknown): LlmProfile[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<LlmProfile>
    if (typeof row.id !== 'string' || typeof row.apiKey !== 'string') return []
    const baseUrl = (row.baseUrl || 'https://api.openai.com/v1').trim()
    return [{
      id: row.id,
      name: (row.name || 'Model').trim() || 'Model',
      baseUrl,
      apiKey: row.apiKey,
      model: (row.model || 'gpt-4o-mini').trim() || 'gpt-4o-mini',
    }]
  })
}

function lsRead(): LlmProfile[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return normalizeProfiles(JSON.parse(raw))
  } catch {
    return []
  }
}

function chromeRead(): Promise<LlmProfile[] | null> {
  return new Promise((resolve) => {
    if (!hasChromeLocal()) return resolve(null)
    try {
      chrome.storage!.local!.get([KEY], (r) => {
        if (chrome.runtime?.lastError) return resolve(null)
        if (!(KEY in (r || {}))) return resolve(null)
        resolve(normalizeProfiles(r[KEY]))
      })
    } catch {
      resolve(null)
    }
  })
}

export async function loadLlmProfiles(): Promise<LlmProfile[]> {
  const fromChrome = await chromeRead()
  if (fromChrome) return fromChrome
  return lsRead()
}

export async function saveLlmProfiles(profiles: LlmProfile[]): Promise<void> {
  const clean = normalizeProfiles(profiles)
  try {
    localStorage.setItem(KEY, JSON.stringify(clean))
  } catch {}
  if (!hasChromeLocal()) return
  await new Promise<void>((resolve) => {
    try {
      chrome.storage!.local!.set({ [KEY]: clean }, () => resolve())
    } catch {
      resolve()
    }
  })
}

export function originPattern(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.protocol}//${url.host}/*`
  } catch {
    return null
  }
}

export function requestModelOrigin(baseUrl: string): Promise<boolean> {
  const pattern = originPattern(baseUrl)
  if (!pattern) return Promise.resolve(false)
  const permissions = typeof chrome !== 'undefined' ? chrome.permissions : undefined
  if (!permissions?.request) return Promise.resolve(true)
  return new Promise((resolve) => {
    try {
      permissions.request({ origins: [pattern] }, (granted) => {
        if (chrome.runtime?.lastError) return resolve(false)
        resolve(!!granted)
      })
    } catch {
      resolve(false)
    }
  })
}
