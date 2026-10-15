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
        borderRight: '1px solid #e6e8ee',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '10px 8px' : '12px 12px', borderBottom: '1px solid #e6e8ee', borderTop: '3px solid #111827' }}>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#111827' }}>Projects</span>}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ width: 28, height: 28, border: '1px solid #e6e8ee', background: '#fff', borderRadius: 8, cursor: 'pointer', color: '#111827' }}
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
                  borderRadius: 10,
                  marginBottom: 4,
                  background: '#fff',
                  border: '1px solid #e6e8ee',
                  borderLeft: activeId === p.id ? '3px solid #2563eb' : '1px solid #e6e8ee',
                  boxShadow: activeId === p.id ? '0 1px 2px rgba(17,24,39,0.05)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, fontSize: 13, fontWeight: activeId === p.id ? 700 : 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const name = prompt('Rename project', p.name)
                    if (name && name.trim()) onRename(p.id, name.trim())
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${p.name}"?`)) onDelete(p.id)
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#f97316' }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid #e6e8ee', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={onCreate}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: 'none',
                background: '#111827',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
              }}
            >
              + Add Project
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onExport}
                title="Export backup"
                style={{ flex: 1, padding: '6px 6px', border: '1px solid #e6e8ee', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#111827' }}
              >
                ⤓ Export
              </button>
              <label
                title="Import backup"
                style={{ flex: 1, padding: '6px 6px', border: '1px solid #e6e8ee', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#111827', textAlign: 'center' }}
              >
                ⤒ Import
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
            <div style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280', lineHeight: 1.4, textAlign: 'center' }}>Backup · local + IDB + sync</div>
          </div>
        </>
      )}
    </div>
  )
}
