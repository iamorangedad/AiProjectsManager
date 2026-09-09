import type { Project } from '../storage/useStorage'

export default function ProjectSidebar({
  projects,
  activeId,
  collapsed,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onToggleCollapse,
  onExport,
  onImport,
}: {
  projects: Project[]
  activeId: string | null
  collapsed: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleCollapse: () => void
  onExport?: () => void
  onImport?: (file: File) => void
}) {
  return (
    <div
      style={{
        width: collapsed ? 48 : 220,
        flexShrink: 0,
        borderRight: '1px solid #e2e8f0',
        background: '#f7fafc',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '12px 8px' : '14px 12px', borderBottom: '1px solid #e2e8f0' }}>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 13, color: '#1a202c' }}>Projects</span>}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ width: 28, height: 28, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelect(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: activeId === p.id ? '#ebf4ff' : 'transparent',
                  border: activeId === p.id ? '1px solid #bee3f8' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, fontSize: 13, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const name = prompt('Rename project', p.name)
                    if (name && name.trim()) onRename(p.id, name.trim())
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#718096' }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${p.name}"?`)) onDelete(p.id)
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#e53e3e' }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={onCreate}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px dashed #a0aec0',
                background: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: '#2d3748',
              }}
            >
              + Add Project
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onExport}
                title="导出备份(防清洗)"
                style={{ flex: 1, padding: '6px 6px', border: '1px solid #bee3f8', background: '#ebf8ff', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#2b6cb0' }}
              >
                ⤓ 导出
              </button>
              <label
                title="导入备份"
                style={{ flex: 1, padding: '6px 6px', border: '1px solid #c6f6d5', background: '#f0fff4', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#276749', textAlign: 'center' }}
              >
                ⤒ 导入
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onImport?.(f)
                    e.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            <div style={{ fontSize: 10, color: '#a0aec0', lineHeight: 1.4, textAlign: 'center' }}>多重备份: local+IDB+sync·清洗可恢复</div>
          </div>
        </>
      )}
    </div>
  )
}
