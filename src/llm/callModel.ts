import type { LlmProfile } from '../storage/llmSettings'

export function readChatContent(body: unknown): string {
  if (!body || typeof body !== 'object') throw new Error('The model returned an unreadable response')
  const choices = (body as { choices?: unknown }).choices
  const first = Array.isArray(choices) ? choices[0] : undefined
  const content = first && typeof first === 'object' ? (first as { message?: { content?: unknown } }).message?.content : undefined
  if (typeof content !== 'string' || !content.trim()) throw new Error('The model returned no text')
  return content
}

export async function callModel(profile: LlmProfile, prompt: string, modelOverride?: string): Promise<string> {
  const base = profile.baseUrl.replace(/\/+$/, '')
  const model = modelOverride?.trim() || profile.model
  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${profile.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
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
