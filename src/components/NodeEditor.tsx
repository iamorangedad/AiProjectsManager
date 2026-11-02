import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DETAILS_MAX_FRACTION, DETAILS_MIN } from '../canvas/panelWidth'
import { callModel } from '../llm/callModel'
import PanelResizeHandle from './PanelResizeHandle'
import { requestModelOrigin, type LlmProfile } from '../storage/llmSettings'
import type { ChatMessage, NodeHistoryEntry } from '../storage/nodeData'
import { storedNodeData, type AppNode, type NodeKind } from '../storage/useStorage'

const fieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  border: '1px solid #e6e8ee',
  borderRadius: 10,
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.45,
  color: '#111827',
  background: '#fff',
  colorScheme: 'light',
  resize: 'vertical',
  outline: 'none',
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: 6,
}

export default function NodeEditor({
  node,
  profiles,
  onSave,
  onClose,
  onDelete,
  onOpenSettings,
  history,
  width,
  onWidth,
}: {
  node: AppNode | null
  profiles: LlmProfile[]
  onSave: (n: AppNode, options?: { quiet?: boolean }) => void
  onClose: () => void
  onDelete?: (id: string) => void
  onOpenSettings: () => void
  history: NodeHistoryEntry[]
  width: number
  onWidth: (width: number) => void
}) {
  const [label, setLabel] = useState(node?.data.label ?? '')
  const [note, setNote] = useState(node?.data.note ?? '')
  const [url, setUrl] = useState(node?.data.url ?? '')
  const [pct, setPct] = useState(node?.data.percentage ?? 0)
  const [kind, setKind] = useState<NodeKind>(node?.data.kind === 'model' ? 'model' : 'task')
  const [profileId, setProfileId] = useState(node?.data.profileId ?? profiles[0]?.id ?? '')
  const [model, setModel] = useState(node?.data.model ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>(storedNodeData(node?.data).messages ?? [])
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const scroller = useRef<HTMLElement>(null)
  const askRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    if (kind === 'model') askRef.current?.focus()
  }, [kind])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, running, runError])

  if (!node) return null

  const selectedProfileId = profiles.some((item) => item.id === profileId) ? profileId : (profiles[0]?.id ?? '')
  const profile = profiles.find((item) => item.id === selectedProfileId) ?? null

  const buildSaved = (next?: { messages?: ChatMessage[]; percentage?: number; history?: NodeHistoryEntry[] }): AppNode => {
    const data = storedNodeData({
      label: label.trim() || 'Unnamed',
      note,
      url,
      percentage: next?.percentage ?? pct,
      kind,
      profileId: selectedProfileId,
      model,
      messages: next?.messages ?? messages,
      history: next?.history ?? history,
    })
    const nextUrl = data.url ?? ''
    if (nextUrl !== url) setUrl(nextUrl)
    return { ...node, data }
  }

  const ask = () => {
    if (!node || running) return
    const text = question.trim()
    if (!profile) {
      setRunError('Add a model in Settings.')
      return
    }
    if (!text) {
      setRunError('Write a question first.')
      return
    }
    const pending = [...messages, { role: 'user' as const, content: text }]
    const parentHistory = history
    setMessages(pending)
    setQuestion('')
    setRunning(true)
    setRunError(null)
    const noteText = note.trim()
    const context = `You are answering questions about a canvas node titled "${label.trim() || 'Unnamed'}".${noteText ? ` Note: ${noteText}` : ''} Reply in the same language as the question.`
    void requestModelOrigin(profile.baseUrl).then(async (allowed) => {
      if (!allowed) {
        setMessages(messages)
        setQuestion(text)
        setRunning(false)
        setRunError('Chrome did not allow calls to that API.')
        return
      }
      try {
        const result = await callModel(profile, pending, model, context, parentHistory)
        const done = [...pending, { role: 'assistant' as const, content: result }]
        setMessages(done)
        setPct(100)
        onSave(buildSaved({ messages: done, percentage: 100, history: parentHistory }), { quiet: true })
      } catch (err) {
        setMessages(messages)
        setQuestion(text)
        setRunError(err instanceof Error ? err.message : 'The model call failed')
      } finally {
        setRunning(false)
      }
    })
  }

  return (
    <aside
      ref={scroller}
      style={{
        width,
        flexShrink: 0,
        position: 'relative',
        borderLeft: '1px solid #e6e8ee',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      <PanelResizeHandle edge="west" width={width} min={DETAILS_MIN} fraction={DETAILS_MAX_FRACTION} label="Resize details" onWidth={onWidth} />
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 14px',
          borderBottom: '1px solid #e6e8ee',
          borderTop: `3px solid ${kind === 'model' ? '#111827' : pct >= 100 ? '#16a34a' : '#2563eb'}`,
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#111827' }}>Node details</div>
        <button
          onClick={onClose}
          title="Close"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid #e6e8ee',
            background: '#fff',
            color: '#111827',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#111827', lineHeight: 1.35, wordBreak: 'break-word' }}>
          {label.trim() || 'Unnamed'}
        </div>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Type</div>
          <select className="tech-field" value={kind} onChange={(e) => setKind(e.target.value === 'model' ? 'model' : 'task')} style={fieldStyle}>
            <option value="task">Task</option>
            <option value="model">Model call</option>
          </select>
        </label>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Label</div>
          <textarea className="tech-field" value={label} rows={kind === 'model' ? 2 : 3} onChange={(e) => setLabel(e.target.value)} placeholder="Node label" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
        </label>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Note</div>
          <textarea className="tech-field" value={note} rows={4} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
        </label>

        {kind === 'task' && (
          <>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>URL</div>
              <textarea className="tech-field" value={url} rows={5} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3000" style={{ ...fieldStyle, wordBreak: 'break-all' }} />
            </label>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>Progress: {pct}%</div>
              <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: '100%', accentColor: pct >= 100 ? '#16a34a' : '#2563eb' }} />
            </label>
          </>
        )}

        {kind === 'model' && (
          <>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>Connection</div>
              {profiles.length === 0 ? (
                <button onClick={onOpenSettings} style={{ padding: '8px 12px', background: '#fff', color: '#2563eb', border: '1px solid #e6e8ee', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Add a model in Settings
                </button>
              ) : (
                <select className="tech-field" value={selectedProfileId} onChange={(e) => setProfileId(e.target.value)} style={fieldStyle}>
                  {profiles.map((item) => (
                    <option key={item.id} value={item.id}>{item.apiKey ? item.name : `${item.name} (no key)`}</option>
                  ))}
                </select>
              )}
              {profile && <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', lineHeight: 1.45, wordBreak: 'break-all' }}>{profile.apiKey ? profile.baseUrl : `${profile.baseUrl} · no API key`}</div>}
            </label>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>Model override</div>
              <input className="tech-field" value={model} onChange={(e) => setModel(e.target.value)} placeholder={profile?.model || 'Use the key default'} style={fieldStyle} />
            </label>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>
              {history.length === 0 ? 'History: no parent nodes' : `History: ${history.map((entry) => entry.label).join(', ')}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && !running && (
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.45 }}>Ask a question. The answer stays in this panel.</div>
              )}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'stretch', maxWidth: '100%' }}>
                  <div style={labelStyle}>{message.role === 'user' ? 'You' : 'Answer'}</div>
                  <div
                    style={{
                      background: message.role === 'user' ? '#111827' : '#f4f6f8',
                      color: message.role === 'user' ? '#fff' : '#111827',
                      border: message.role === 'user' ? 'none' : '1px solid #e6e8ee',
                      borderRadius: 12,
                      padding: '8px 10px',
                      fontSize: 13,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {running && <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>Thinking…</div>}
            </div>
          </>
        )}

        <div style={{ position: 'sticky', bottom: 0, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8, margin: '0 -14px -14px', padding: 14, borderTop: '1px solid #e6e8ee' }}>
          {kind === 'model' && (
            <>
              {runError && <div style={{ fontSize: 12, color: '#f97316', lineHeight: 1.45, wordBreak: 'break-word' }}>{runError}</div>}
              <textarea
                ref={askRef}
                className="tech-field"
                value={question}
                rows={3}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
                placeholder="Ask a question"
                style={{ ...fieldStyle, wordBreak: 'break-word' }}
              />
              <button
                disabled={running || !profile}
                onClick={ask}
                style={{ padding: '8px 14px', background: running || !profile ? '#9ca3af' : '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: running || !profile ? 'default' : 'pointer', fontWeight: 600 }}
              >
                {running ? 'Asking…' : 'Ask'}
              </button>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(node.id)
                  onClose()
                }}
                style={{ padding: '8px 12px', background: '#fff', color: '#f97316', border: '1px solid #fed7aa', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            )}
            <button
              onClick={() => onSave(buildSaved())}
              style={{ marginLeft: 'auto', padding: '8px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
