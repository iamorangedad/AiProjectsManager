import { Handle, Position, type NodeProps } from '@xyflow/react'

export type CustomNodeData = {
  label: string
  url?: string
  percentage: number
  kind?: 'task' | 'model'
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
}

const NODE_WIDTH = 148
const NODE_HEIGHT = 52

export default function CustomNode({ data, selected }: NodeProps) {
  const d = (data ?? { label: 'Unnamed', percentage: 0 }) as unknown as CustomNodeData
  const pct = Math.max(0, Math.min(100, d.percentage ?? 0))
  const accent = pct >= 100 ? '#16a34a' : '#2563eb'
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
        borderRadius: 10,
        padding: '6px 8px 5px',
        boxShadow: selected ? '0 8px 18px rgba(37,99,235,0.12)' : '0 1px 2px rgba(17,24,39,0.05)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 7, height: 7, background: accent, border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="source" position={Position.Right} style={{ width: 7, height: 7, background: accent, border: '2px solid #fff', zIndex: 10 }} />
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
            width: 14,
            height: 14,
            borderRadius: 4,
            border: '1px solid #e6e8ee',
            background: '#fff',
            color: '#111827',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '12px',
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
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: d.hasChildren ? 16 : 0,
          lineHeight: '16px',
        }}
      >
        {d.label || 'Unnamed'}
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: '#eef1f4', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: accent, transition: 'width 0.2s' }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{d.kind === 'model' ? 'LLM' : `${pct}%`}</div>
      </div>
    </div>
  )
}
