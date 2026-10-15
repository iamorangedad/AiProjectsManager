import { useEffect, useState, type CSSProperties } from 'react'
import type { AppNode } from '../storage/useStorage'

const fieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.45,
  color: '#1a202c',
  background: '#fff',
  resize: 'vertical',
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
        borderLeft: '1px solid #e2e8f0',
        background: '#f8fafc',
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
          borderBottom: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a202c' }}>Node details</div>
        <button
          onClick={onClose}
          title="Close"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a202c', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {label.trim() || 'Unnamed'}
        </div>

        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: '#3182ce', lineHeight: 1.45, wordBreak: 'break-all' }}
          >
            {openUrl}
          </a>
        )}

        <div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#38a169' : '#3182ce' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#718096' }}>{pct}% complete</div>
        </div>

        <label style={{ display: 'block' }}>
          <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 4 }}>Label</div>
          <textarea value={label} rows={4} onChange={(e) => setLabel(e.target.value)} placeholder="Node label" style={{ ...fieldStyle, wordBreak: 'break-word' }} />
        </label>

        <label style={{ display: 'block' }}>
          <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 4 }}>URL</div>
          <textarea value={url} rows={5} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ ...fieldStyle, wordBreak: 'break-all' }} />
        </label>

        <label style={{ display: 'block' }}>
          <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 4 }}>Progress: {pct}%</div>
          <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: '100%' }} />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {onDelete && (
            <button
              onClick={() => {
                onDelete(node.id)
                onClose()
              }}
              style={{ padding: '8px 12px', background: '#fff', color: '#e53e3e', border: '1px solid #feb2b2', borderRadius: 8, cursor: 'pointer' }}
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
            style={{ marginLeft: 'auto', padding: '8px 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </aside>
  )
}
