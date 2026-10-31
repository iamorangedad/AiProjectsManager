import type { Project } from './useStorage'

// Keep this port aligned with mcp/src/http.ts DEFAULT_PORT.
const MCP_BASE = 'http://127.0.0.1:47821'

export async function mcpGet(): Promise<{ data: Project[] | null; ts: number }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 500)
  try {
    const res = await fetch(`${MCP_BASE}/api/projects`, { signal: ctrl.signal })
    if (!res.ok) return { data: null, ts: 0 }
    const body = (await res.json()) as { projects?: unknown; updatedAt?: unknown }
    if (!body || !Array.isArray(body.projects)) return { data: null, ts: 0 }
    return { data: body.projects as Project[], ts: typeof body.updatedAt === 'number' ? body.updatedAt : 0 }
  } catch {
    return { data: null, ts: 0 }
  } finally {
    clearTimeout(timer)
  }
}

export function mcpSet(projects: Project[], ts: number) {
  void fetch(`${MCP_BASE}/api/projects`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, updatedAt: ts }),
  }).catch(() => {})
}
