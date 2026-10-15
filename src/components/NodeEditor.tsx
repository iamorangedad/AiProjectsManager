import { useEffect, useState, type CSSProperties } from 'react'
import type { AppNode } from '../storage/useStorage'

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
  onSave,
  onClose,
  onDelete,
}: {
  node: AppNode | null
  onSave: (n: AppNode) => void
  onClose: () => void
  onDelete?: (id: string) => void
}) {
  const [label, setLabel] = useState(node?.data.label ?? '')
  const [url, setUrl] = useState(node?.data.url ?? '')
  const [pct, setPct] = useState(node?.data.percentage ?? 0)

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
          borderTop: '3px solid #2563eb',
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

        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: '#2563eb', lineHeight: 1.45, wordBreak: 'break-all' }}
          >
            {openUrl}
          </a>
        )}

        <div>
          <div style={{ height: 4, background: '#eef1f4', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#f97316' : '#2563eb' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>{pct}% complete</div>
        </div>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Label</div>
          <textarea className="tech-field" value={label} rows={4} onChange={(e) => setLabel(e.target.value)} placeholder="Node label" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
        </label>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>URL</div>
          <textarea className="tech-field" value={url} rows={5} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ ...fieldStyle, wordBreak: 'break-all' }} />
        </label>

        <label style={{ display: 'block' }}>
          <div style={labelStyle}>Progress: {pct}%</div>
          <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: '100%', accentColor: pct >= 100 ? '#f97316' : '#2563eb' }} />
        </label>

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
            onClick={() => {
              const trimmed = label.trim() || 'Unnamed'
              let normalizedUrl: string | undefined = url.trim() || undefined
              if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`
              onSave({ ...node, data: { label: trimmed, url: normalizedUrl, percentage: pct } })
            }}
            style={{ marginLeft: 'auto', padding: '8px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </aside>
  )
}
