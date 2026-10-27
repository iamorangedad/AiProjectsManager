import type { ChatMessage, NodeHistoryEntry } from '../storage/nodeData'
import type { LlmProfile } from '../storage/llmSettings'

export function buildChatMessages(messages: ChatMessage[], context?: string): { role: string; content: string }[] {
  const turns = messages.flatMap((message) => {
    if ((message.role !== 'user' && message.role !== 'assistant') || !message.content.trim()) return []
    return [{ role: message.role, content: message.content.trim() }]
  })
  if (!context?.trim()) return turns
  return [{ role: 'system', content: context.trim() }, ...turns]
}

export function formatParentHistory(history: NodeHistoryEntry[]): string {
  if (!history.length) return ''
  const blocks = history.map((entry, index) => {
    const lines = [`${index + 1}. ${entry.label} (${entry.kind})`]
    if (entry.url) lines.push(entry.url)
    if (entry.note) lines.push(entry.note)
    if (entry.kind === 'task') lines.push(`${entry.percentage}% complete`)
    for (const message of entry.messages ?? []) {
      lines.push(`${message.role === 'user' ? 'Question' : 'Answer'}: ${message.content}`)
    }
    return lines.join('\n')
  })
  return `Parent nodes:\n${blocks.join('\n\n')}`
}

export function buildChatRequest(model: string, messages: ChatMessage[], context?: string, history: NodeHistoryEntry[] = []) {
  const historyText = formatParentHistory(history)
  const fullContext = [context?.trim(), historyText].filter(Boolean).join('\n\n')
  return {
    model,
    messages: buildChatMessages(messages, fullContext),
  }
}

export function readChatContent(body: unknown): string {
  if (!body || typeof body !== 'object') throw new Error('The model returned an unreadable response')
  const choices = (body as { choices?: unknown }).choices
  const first = Array.isArray(choices) ? choices[0] : undefined
  const content = first && typeof first === 'object' ? (first as { message?: { content?: unknown } }).message?.content : undefined
  if (typeof content !== 'string' || !content.trim()) throw new Error('The model returned no text')
  return content
}

export function chatHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = apiKey.trim()
  if (key) headers.Authorization = `Bearer ${key}`
  return headers
}

export async function callModel(profile: LlmProfile, messages: ChatMessage[], modelOverride?: string, context?: string, history: NodeHistoryEntry[] = []): Promise<string> {
  const request = buildChatRequest(modelOverride?.trim() || profile.model, messages, context, history)
  if (!request.messages.some((message) => message.role === 'user')) throw new Error('Write a question first.')
  const base = profile.baseUrl.replace(/\/+$/, '')
  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: chatHeaders(profile.apiKey),
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error('Could not reach the model API. In Chrome, allow the site when prompted. A local dev page may be blocked by the API.')
  }
  const raw = await response.text()
  if (!response.ok) {
    throw new Error(raw.slice(0, 280) || `Request failed (${response.status})`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The model API did not return JSON')
  }
  return readChatContent(parsed)
}
