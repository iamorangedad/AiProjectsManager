import { useEffect, useState, type CSSProperties } from 'react'
import { callModel } from '../llm/callModel'
import { requestModelOrigin, type LlmProfile } from '../storage/llmSettings'
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
}: {
  node: AppNode | null
  profiles: LlmProfile[]
  onSave: (n: AppNode) => void
  onClose: () => void
  onDelete?: (id: string) => void
  onOpenSettings: () => void
}) {
  const [label, setLabel] = useState(node?.data.label ?? '')
  const [url, setUrl] = useState(node?.data.url ?? '')
  const [pct, setPct] = useState(node?.data.percentage ?? 0)
  const [kind, setKind] = useState<NodeKind>(node?.data.kind === 'model' ? 'model' : 'task')
  const [profileId, setProfileId] = useState(node?.data.profileId ?? profiles[0]?.id ?? '')
  const [model, setModel] = useState(node?.data.model ?? '')
  const [prompt, setPrompt] = useState(node?.data.prompt ?? '')
  const [output, setOutput] = useState(node?.data.output ?? '')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!node) return null

  const trimmedUrl = url.trim()
  const openUrl = trimmedUrl ? (/^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`) : ''
  const selectedProfileId = profiles.some((item) => item.id === profileId) ? profileId : (profiles[0]?.id ?? '')
  const profile = profiles.find((item) => item.id === selectedProfileId) ?? null

  const buildSaved = (next?: { output?: string; percentage?: number }): AppNode => {
    let normalizedUrl: string | undefined = url.trim() || undefined
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`
    return {
      ...node,
      data: storedNodeData({
        label: label.trim() || 'Unnamed',
        url: normalizedUrl,
        percentage: next?.percentage ?? pct,
        kind,
        profileId: selectedProfileId,
        model,
        prompt,
        output: next?.output ?? output,
      }),
    }
  }

  return (
    <aside
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: '1px solid #e6e8ee',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'auto',
      }}
    >
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

        {kind === 'task' && openUrl && (
          <a href={openUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', lineHeight: 1.45, wordBreak: 'break-all' }}>
            {openUrl}
          </a>
        )}

        {kind === 'task' && (
          <div>
            <div style={{ height: 4, background: '#eef1f4', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#2563eb' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>{pct}% complete</div>
          </div>
        )}

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Label</div>
          <textarea className="tech-field" value={label} rows={kind === 'model' ? 2 : 4} onChange={(e) => setLabel(e.target.value)} placeholder="Node label" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
        </label>

        {kind === 'task' && (
          <>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>URL</div>
              <textarea className="tech-field" value={url} rows={5} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ ...fieldStyle, wordBreak: 'break-all' }} />
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
              <div style={labelStyle}>API key</div>
              {profiles.length === 0 ? (
                <button onClick={onOpenSettings} style={{ padding: '8px 12px', background: '#fff', color: '#2563eb', border: '1px solid #e6e8ee', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Add an API key in Settings
                </button>
              ) : (
                <select className="tech-field" value={selectedProfileId} onChange={(e) => setProfileId(e.target.value)} style={fieldStyle}>
                  {profiles.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              )}
            </label>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>Model override</div>
              <input className="tech-field" value={model} onChange={(e) => setModel(e.target.value)} placeholder={profile?.model || 'Use the key default'} style={fieldStyle} />
            </label>
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>Prompt</div>
              <textarea className="tech-field" value={prompt} rows={5} onChange={(e) => setPrompt(e.target.value)} placeholder="What should the model do?" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
            </label>
            <button
              disabled={running || !profile}
              onClick={() => {
                if (!profile) return
                const text = prompt.trim() || label.trim()
                if (!text) {
                  setRunError('Write a prompt first.')
                  return
                }
                setRunning(true)
                setRunError(null)
                void requestModelOrigin(profile.baseUrl).then(async (allowed) => {
                  if (!allowed) {
                    setRunning(false)
                    setRunError('Chrome did not allow calls to that API.')
                    return
                  }
                  try {
                    const result = await callModel(profile, text, model)
                    setOutput(result)
                    setPct(100)
                    onSave(buildSaved({ output: result, percentage: 100 }))
                  } catch (err) {
                    setRunError(err instanceof Error ? err.message : 'The model call failed')
                  } finally {
                    setRunning(false)
                  }
                })
              }}
              style={{ padding: '8px 14px', background: running || !profile ? '#9ca3af' : '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: running || !profile ? 'default' : 'pointer', fontWeight: 600 }}
            >
              {running ? 'Running…' : 'Run model'}
            </button>
            {runError && <div style={{ fontSize: 12, color: '#f97316', lineHeight: 1.45, wordBreak: 'break-word' }}>{runError}</div>}
            {output && (
              <label style={{ display: 'block' }}>
                <div style={labelStyle}>Output</div>
                <textarea className="tech-field" readOnly value={output} rows={6} style={{ ...fieldStyle, wordBreak: 'break-word', background: '#f8fafc' }} />
              </label>
            )}
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
    </aside>
  )
}
