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
  messages?: ChatMessage[]
}

export interface AppNodeData {
  label: string
  url?: string
  percentage: number
  kind?: NodeKind
  profileId?: string
  model?: string
  prompt?: string
  output?: string
  messages?: ChatMessage[]
  history?: NodeHistoryEntry[]
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
    if (typeof row.url === 'string' && row.url.trim()) entry.url = row.url.trim()
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
  const base: AppNodeData = {
    label: (data?.label || fallbackLabel).trim() || fallbackLabel,
    url: data?.url?.trim() || undefined,
    percentage: Math.max(0, Math.min(100, Number(data?.percentage) || 0)),
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
