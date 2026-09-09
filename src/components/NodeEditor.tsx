import { useState, useEffect } from 'react'
import type { AppNode } from '../storage/useStorage'

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
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (node) {
      setLabel(node.data.label)
      setUrl(node.data.url || '')
      setPct(node.data.percentage)
    }
  }, [node])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!node) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 360, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Edit Node</h3>
        <label style={{ display: 'block', fontSize: 12, color: '#4a5568', marginBottom: 4 }}>Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Node label"
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}
        />
        <label style={{ display: 'block', fontSize: 12, color: '#4a5568', marginBottom: 4 }}>URL (optional)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}
        />
        <label style={{ display: 'block', fontSize: 12, color: '#4a5568', marginBottom: 4 }}>Progress: {pct}%</label>
        <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: '100%', marginBottom: 16 }} />
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
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', background: '#edf2f7', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => {
                const trimmed = label.trim() || 'Unnamed'
                let normalizedUrl: string | undefined = url.trim() || undefined
                if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`
                onSave({ ...node, data: { label: trimmed, url: normalizedUrl, percentage: pct } })
                onClose()
              }}
              style={{ padding: '8px 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Save
            </button>
          </div>
        </div>
        {url.trim() && (
          <button
            onClick={() => {
              let u = url.trim()
              if (!/^https?:\/\//i.test(u)) u = `https://${u}`
              window.open(u, '_blank')
            }}
            style={{ marginTop: 10, fontSize: 12, color: '#3182ce', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Open URL ↗
          </button>
        )}
      </div>
    </div>
  )
}
