import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, MarkerType, type Connection, type NodeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStorage, type AppNode, type Project } from '../storage/useStorage'
import CustomNode from '../components/CustomNode'
import ProjectSidebar from '../components/ProjectSidebar'
import NodeEditor from '../components/NodeEditor'

const nodeTypes: NodeTypes = { custom: CustomNode }
const arrowMarker = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#3182ce' } as const

export default function CanvasPage() {
  const { projects, loaded, createProject, deleteProject, updateProject, renameProject } = useStorage()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([] as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any)
  const [editingNode, setEditingNode] = useState<AppNode | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const flowRef = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<any>(null)

  const activeProject = useMemo(() => projects.find((p) => p.id === activeId) || null, [projects, activeId])

  useEffect(() => {
    if (!loaded) return
    if (!activeId && projects.length > 0) setActiveId(projects[0].id)
    if (activeId && !projects.find((p) => p.id === activeId) && projects.length > 0) setActiveId(projects[0].id)
  }, [loaded, projects, activeId])

  useEffect(() => {
    setCollapsedIds(new Set())
  }, [activeId])

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
        setTimeout(() => setToast('Expanded'), 0)
      } else {
        next.add(nodeId)
        setTimeout(() => setToast('Collapsed'), 0)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!activeProject) return
    const flowNodes = activeProject.nodes.map((n) => ({
      id: n.id,
      type: 'custom',
      position: n.position,
      data: n.data as any,
    }))
    const flowEdges = activeProject.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      markerEnd: arrowMarker,
      style: { stroke: '#3182ce', strokeWidth: 1.5 },
    }))
    setNodes(flowNodes as any)
    setEdges(flowEdges as any)
  }, [activeProject?.id])

  const persist = useCallback(
    (nextNodes: any[], nextEdges: any[]) => {
      if (!activeId || !activeProject) return
      const toAppNodes: AppNode[] = nextNodes.map((n: any) => ({
        id: n.id,
        type: n.type || 'custom',
        position: n.position,
        data: { label: n.data.label, url: n.data.url, percentage: n.data.percentage },
      }))
      const toAppEdges = nextEdges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }))
      const updated: Project = { ...activeProject, nodes: toAppNodes, edges: toAppEdges }
      updateProject(updated)
    },
    [activeId, activeProject, updateProject],
  )

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1600)
  }

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...params, id: `e${Date.now()}`, markerEnd: arrowMarker, style: { stroke: '#3182ce', strokeWidth: 1.5 } }, eds)
        setTimeout(() => persist((nodes as any), next as any), 0)
        showToast('Connected')
        return next
      })
    },
    [nodes, persist, setEdges],
  )

  const onNodesChangeWrapped = useCallback(
    (changes: any) => {
      onNodesChange(changes)
    },
    [onNodesChange],
  )

  const onNodeClick = useCallback((_e: any, node: any) => {
    const clean = { label: node.data.label, url: node.data.url, percentage: node.data.percentage }
    setEditingNode({ id: node.id, type: node.type, position: node.position, data: clean as any })
  }, [])

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (!reactFlowInstance.current || !flowRef.current) return
      const bounds = flowRef.current.getBoundingClientRect()
      const flowPos = reactFlowInstance.current.screenToFlowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
      setCtxMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y })
    },
    [],
  )

  const addNodeAt = useCallback(
    (x: number, y: number) => {
      const newNode: AppNode = {
        id: `n${Date.now()}`,
        type: 'custom',
        position: { x, y },
        data: { label: 'New Node', percentage: 0 },
      }
      const flowNode: any = { id: newNode.id, type: 'custom', position: { x, y }, data: newNode.data }
      const nextNodes = [...(nodes as any), flowNode]
      setNodes(nextNodes as any)
      setTimeout(() => persist(nextNodes as any, edges as any), 0)
      showToast('Node added')
      setEditingNode(newNode)
    },
    [nodes, edges, persist, setNodes],
  )

  const handleSaveNode = useCallback(
    (updated: AppNode) => {
      const nextNodes = (nodes as any).map((n: any) => (n.id === updated.id ? { ...n, data: updated.data } : n))
      setNodes(nextNodes as any)
      setTimeout(() => persist(nextNodes as any, edges as any), 0)
      showToast('Saved')
    },
    [nodes, edges, persist, setNodes],
  )

  const handleDeleteNode = useCallback(
    (id: string) => {
      const nextNodes = (nodes as any).filter((n: any) => n.id !== id)
      const nextEdges = (edges as any).filter((e: any) => e.source !== id && e.target !== id)
      setNodes(nextNodes as any)
      setEdges(nextEdges as any)
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setTimeout(() => persist(nextNodes as any, nextEdges as any), 0)
      showToast('Node deleted')
    },
    [nodes, edges, persist, setNodes, setEdges],
  )

  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      const ids = new Set(deleted.map((n) => n.id))
      const nextEdges = (edges as any).filter((e: any) => !ids.has(e.source) && !ids.has(e.target))
      setEdges(nextEdges as any)
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id as string))
        return next
      })
      setTimeout(() => persist((nodes as any).filter((n: any) => !ids.has(n.id)), nextEdges as any), 0)
    },
    [nodes, edges, persist, setEdges],
  )

  const onEdgesDelete = useCallback(
    (_deleted: any[]) => {
      setTimeout(() => persist(nodes as any, edges as any), 0)
    },
    [nodes, edges, persist],
  )

  const onNodeDragStop = useCallback(() => {
    setTimeout(() => {
      const current = (reactFlowInstance.current?.getNodes?.() as any[]) || (nodes as any)
      persist(current as any, edges as any)
    }, 0)
  }, [nodes, edges, persist])

  const { displayNodes, displayEdges, hiddenCount } = useMemo(() => {
    const adj = new Map<string, string[]>()
    ;(edges as any[]).forEach((e: any) => {
      if (!adj.has(e.source)) adj.set(e.source, [])
      adj.get(e.source)!.push(e.target)
    })
    const hidden = new Set<string>()
    const queue: string[] = [...collapsedIds]
    const visited = new Set<string>(queue)
    while (queue.length) {
      const cur = queue.shift()!
      const childs = adj.get(cur) || []
      for (const child of childs) {
        if (!hidden.has(child)) hidden.add(child)
        if (!visited.has(child)) {
          visited.add(child)
          queue.push(child)
        }
      }
    }
    const filteredNodes = (nodes as any[]).filter((n: any) => !hidden.has(n.id))
    const filteredEdges = (edges as any[]).filter((e: any) => !hidden.has(e.source) && !hidden.has(e.target))
    const decorated = filteredNodes.map((n: any) => {
      const hasChildren = (adj.get(n.id)?.length || 0) > 0
      const isCollapsed = collapsedIds.has(n.id)
      return {
        ...n,
        data: { ...n.data, hasChildren, isCollapsed, onToggle: () => toggleCollapse(n.id) },
      }
    })
    return { displayNodes: decorated, displayEdges: filteredEdges, hiddenCount: hidden.size }
  }, [nodes, edges, collapsedIds, toggleCollapse])

  if (!loaded) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>Loading…</div>
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ProjectSidebar
        projects={projects}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onSelect={setActiveId}
        onCreate={() => {
          const p = createProject()
          setActiveId(p.id)
          showToast('Project created')
        }}
        onRename={renameProject}
        onDelete={(id) => {
          deleteProject(id)
          showToast('Project deleted')
        }}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 44, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a202c' }}>{activeProject?.name || '—'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#718096' }}>
              {displayNodes.length} visible · {hiddenCount > 0 ? `${hiddenCount} hidden · ` : ''}{edges.length} edges
            </span>
            {hiddenCount > 0 && (
              <button
                onClick={() => setCollapsedIds(new Set())}
                style={{ padding: '4px 8px', background: '#edf2f7', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
              >
                Expand all
              </button>
            )}
            <button onClick={() => addNodeAt(100, 100)} style={{ padding: '6px 12px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
              + Add Node
            </button>
          </div>
        </div>

        <div ref={flowRef} style={{ flex: 1, position: 'relative' }} onContextMenu={onPaneContextMenu}>
          <ReactFlow
            nodes={displayNodes as any}
            edges={displayEdges as any}
            onNodesChange={onNodesChangeWrapped}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(inst) => (reactFlowInstance.current = inst)}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ markerEnd: arrowMarker, style: { stroke: '#3182ce', strokeWidth: 1.5 } }}
            connectionLineStyle={{ stroke: '#3182ce', strokeWidth: 1.5 }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            onPaneClick={() => setCtxMenu(null)}
          >
            <Background />
            <Controls />
            <MiniMap style={{ border: '1px solid #e2e8f0' }} />
          </ReactFlow>

          {ctxMenu && (
            <div onClick={() => setCtxMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 20 }}>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: ctxMenu.x,
                  top: ctxMenu.y,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  zIndex: 21,
                }}
              >
                <button
                  onClick={() => {
                    addNodeAt(ctxMenu.flowX, ctxMenu.flowY)
                    setCtxMenu(null)
                  }}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                >
                  + Add Node here
                </button>
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,0.92)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#4a5568', pointerEvents: 'none' }}>
            Right-click canvas → Add Node · Drag handles to connect · Click ∓ on source handle to collapse subtree · Click node to edit
          </div>
        </div>
      </div>

      <NodeEditor node={editingNode} onSave={handleSaveNode} onClose={() => setEditingNode(null)} onDelete={handleDeleteNode} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a202c', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, zIndex: 60 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
