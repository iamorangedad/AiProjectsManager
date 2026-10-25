import { useEffect, useState } from 'react'
import { requestModelOrigin, type LlmProfile } from '../storage/llmSettings'

const field = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '8px 10px',
  border: '1px solid #e6e8ee',
  borderRadius: 10,
  font: 'inherit',
  fontSize: 13,
  color: '#111827',
  background: '#fff',
  colorScheme: 'light',
  outline: 'none',
}

const label = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#6b7280',
  marginBottom: 6,
}

function blank(): LlmProfile {
  return { id: '', name: '', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' }
}

export default function SettingsPanel({
  profiles,
  onSave,
  onClose,
}: {
  profiles: LlmProfile[]
  onSave: (next: LlmProfile[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<LlmProfile>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reset = () => {
    setDraft(blank())
    setEditingId(null)
    setError(null)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(17,24,39,0.28)' }}>
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 380,
          background: '#fff',
          borderLeft: '1px solid #e6e8ee',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #e6e8ee' }}>
          <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Settings</div>
          <button onClick={onClose} title="Close" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e6e8ee', background: '#fff', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        <div style={{ padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.45 }}>
            Model nodes call an OpenAI-compatible chat API. Keys stay in this browser and are not included in project export.
          </div>
          {profiles.length === 0 && <div style={{ fontSize: 13, color: '#6b7280' }}>No API keys yet.</div>}
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setEditingId(profile.id)
                setDraft({ ...profile, apiKey: '' })
                setError(null)
              }}
              style={{ textAlign: 'left', border: '1px solid #e6e8ee', borderLeft: editingId === profile.id ? '3px solid #2563eb' : '1px solid #e6e8ee', borderRadius: 10, background: '#fff', padding: '8px 10px', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{profile.model} · key ••••{profile.apiKey.slice(-4)}</div>
            </button>
          ))}
          <label style={{ display: 'block' }}>
            <div style={label}>Name</div>
            <input className="tech-field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="DeepSeek" style={field} />
          </label>
          <label style={{ display: 'block' }}>
            <div style={label}>Base URL</div>
            <input className="tech-field" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" style={field} />
          </label>
          <label style={{ display: 'block' }}>
            <div style={label}>Model</div>
            <input className="tech-field" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="gpt-4o-mini" style={field} />
          </label>
          <label style={{ display: 'block' }}>
            <div style={label}>API key</div>
            <input className="tech-field" type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={editingId ? 'Leave blank to keep the saved key' : 'sk-...'} style={field} autoComplete="off" />
          </label>
          {error && <div style={{ fontSize: 12, color: '#f97316', lineHeight: 1.4 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            {editingId && (
              <button
                onClick={() => {
                  onSave(profiles.filter((p) => p.id !== editingId))
                  reset()
                }}
                style={{ padding: '8px 12px', background: '#fff', color: '#f97316', border: '1px solid #fed7aa', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
            )}
            <button
              onClick={() => {
                const name = draft.name.trim()
                const baseUrl = draft.baseUrl.trim()
                const model = draft.model.trim()
                const existing = profiles.find((p) => p.id === editingId)
                const apiKey = draft.apiKey.trim() || existing?.apiKey || ''
                if (!name || !baseUrl || !model || !apiKey) {
                  setError('Name, base URL, model, and API key are required.')
                  return
                }
                let parsed: URL
                try {
                  parsed = new URL(baseUrl)
                } catch {
                  setError('Base URL must start with http:// or https://')
                  return
                }
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                  setError('Base URL must start with http:// or https://')
                  return
                }
                void requestModelOrigin(baseUrl).then((allowed) => {
                  if (!allowed) {
                    setError('Chrome did not allow calls to that address.')
                    return
                  }
                  const next: LlmProfile = { id: existing?.id || `k${Date.now()}`, name, baseUrl, apiKey, model }
                  onSave(existing ? profiles.map((p) => (p.id === existing.id ? next : p)) : [...profiles, next])
                  reset()
                })
              }}
              style={{ marginLeft: 'auto', padding: '8px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              {editingId ? 'Update key' : 'Add key'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
