import { Handle, Position, type NodeProps } from '@xyflow/react'

export type CustomNodeData = {
  label: string
  url?: string
  percentage: number
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
}

export default function CustomNode({ data, selected }: NodeProps) {
  const d = data as unknown as CustomNodeData
  const pct = Math.max(0, Math.min(100, d.percentage ?? 0))
  return (
    <div
      style={{
        minWidth: 180,
        background: selected ? '#f0f7ff' : '#fff',
        border: `1.5px solid ${selected ? '#3182ce' : '#e2e8f0'}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: selected ? '0 4px 12px rgba(49,130,206,0.18)' : '0 1px 4px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#3182ce', zIndex: 10 }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: '#3182ce', zIndex: 10 }} />
      {d.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            d.onToggle?.()
          }}
          title={d.isCollapsed ? 'Expand children' : 'Collapse children'}
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1px solid #3182ce',
            background: '#fff',
            color: '#3182ce',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
        >
          {d.isCollapsed ? '+' : '−'}
        </button>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a202c', wordBreak: 'break-word', paddingRight: d.hasChildren ? 8 : 0 }}>
        {d.label || 'Unnamed'}
      </div>
      {d.url && (
        <a
          href={d.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 11, color: '#3182ce', wordBreak: 'break-all', display: 'block', marginTop: 4 }}
        >
          {d.url}
        </a>
      )}
      <div style={{ marginTop: 8 }}>
        <div style={{ height: 6, background: '#edf2f7', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#38a169' : '#3182ce', transition: 'width 0.2s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{pct}%</div>
      </div>
    </div>
  )
}
