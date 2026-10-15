import { Handle, Position, type NodeProps } from '@xyflow/react'

export type CustomNodeData = {
  label: string
  url?: string
  percentage: number
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 76

export default function CustomNode({ data, selected }: NodeProps) {
  const d = data as unknown as CustomNodeData
  const pct = Math.max(0, Math.min(100, d.percentage ?? 0))
  const accent = selected ? '#2563eb' : pct >= 100 ? '#f97316' : '#111827'
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#fff',
        border: `1px solid ${selected ? '#2563eb' : '#e6e8ee'}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 12,
        padding: '9px 12px 8px',
        boxShadow: selected ? '0 8px 18px rgba(37,99,235,0.12)' : '0 1px 2px rgba(17,24,39,0.05)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: accent, border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: accent, border: '2px solid #fff', zIndex: 10 }} />
      {d.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            d.onToggle?.()
          }}
          title={d.isCollapsed ? 'Expand children' : 'Collapse children'}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 16,
            height: 16,
            borderRadius: 4,
            border: '1px solid #e6e8ee',
            background: '#fff',
            color: '#111827',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: '14px',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 5,
          }}
        >
          {d.isCollapsed ? '+' : '−'}
        </button>
      )}
      <div
        title={d.label || 'Unnamed'}
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: d.hasChildren ? 18 : 0,
          lineHeight: '18px',
        }}
      >
        {d.label || 'Unnamed'}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: '#eef1f4', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: accent, transition: 'width 0.2s' }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
      </div>
    </div>
  )
}
