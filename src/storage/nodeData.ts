export type NodeKind = 'task' | 'model'
export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface NodeHistoryEntry {
  id: string
  label: string
  kind: NodeKind
  percentage: number
  url?: string
  note?: string
  messages?: ChatMessage[]
}

export interface AppNodeData {
  label: string
  url?: string
  note?: string
  percentage: number
  kind?: NodeKind
  profileId?: string
  model?: string
  prompt?: string
  output?: string
  messages?: ChatMessage[]
  history?: NodeHistoryEntry[]
}

function urlHost(value: string): string {
  const head = value.split(/[/?#]/, 1)[0] ?? ''
  if (head.startsWith('[')) {
    const end = head.indexOf(']')
    return (end >= 0 ? head.slice(1, end) : head.slice(1)).toLowerCase()
  }
  if (head.toLowerCase() === '::1') return '::1'
  return head.replace(/:\d+$/, '').toLowerCase()
}

function isLocalHost(host: string): boolean {
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true
  const parts = host.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false
  const nums = parts.map(Number)
  if (nums.some((n) => n > 255)) return false
  const [a, b] = nums
  if (a === 127 || a === 10 || a === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

export function normalizeNodeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${isLocalHost(urlHost(trimmed)) ? 'http' : 'https'}://${trimmed}`
}

export function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const messages: ChatMessage[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    const text = content.trim()
    if (!text) continue
    messages.push({ role, content: text })
  }
  return messages.slice(-40)
}

export function normalizeHistory(value: unknown): NodeHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const entries: NodeHistoryEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Partial<NodeHistoryEntry>
    if (typeof row.id !== 'string' || !row.id.trim()) continue
    const kind: NodeKind = row.kind === 'model' ? 'model' : 'task'
    const entry: NodeHistoryEntry = {
      id: row.id,
      label: (row.label || 'Unnamed').trim() || 'Unnamed',
      kind,
      percentage: Math.max(0, Math.min(100, Number(row.percentage) || 0)),
    }
    const url = typeof row.url === 'string' ? normalizeNodeUrl(row.url) : undefined
    if (url) entry.url = url
    if (typeof row.note === 'string' && row.note.trim()) entry.note = row.note.trim()
    if (kind === 'model') {
      const messages = normalizeMessages(row.messages)
      if (messages.length) entry.messages = messages
    }
    entries.push(entry)
  }
  return entries.slice(-40)
}

export function storedNodeData(data: Partial<AppNodeData> | undefined, fallbackLabel = 'Unnamed'): AppNodeData {
  const kind: NodeKind = data?.kind === 'model' ? 'model' : 'task'
  const note = data?.note?.trim() || undefined
  const base: AppNodeData = {
    label: (data?.label || fallbackLabel).trim() || fallbackLabel,
    url: normalizeNodeUrl(data?.url),
    percentage: Math.max(0, Math.min(100, Number(data?.percentage) || 0)),
    ...(note ? { note } : {}),
  }
  if (kind !== 'model') return base
  const fromMessages = normalizeMessages(data?.messages)
  const messages = fromMessages.length
    ? fromMessages
    : normalizeMessages([
        ...(data?.prompt?.trim() ? [{ role: 'user' as const, content: data.prompt }] : []),
        ...(data?.output?.trim() ? [{ role: 'assistant' as const, content: data.output }] : []),
      ])
  const history = normalizeHistory(data?.history)
  return {
    ...base,
    kind,
    profileId: data?.profileId || undefined,
    model: data?.model?.trim() || undefined,
    ...(messages.length ? { messages } : {}),
    ...(history.length ? { history } : {}),
  }
}
