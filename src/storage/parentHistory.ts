import { storedNodeData, type AppNodeData, type NodeHistoryEntry } from './nodeData.ts'

type HistoryNode = { id: string; data?: unknown }
type HistoryEdge = { source?: string; target?: string }

function historyEntry(node: HistoryNode): NodeHistoryEntry {
  const raw = node.data && typeof node.data === 'object' ? (node.data as Partial<AppNodeData>) : undefined
  const data = storedNodeData(raw)
  const entry: NodeHistoryEntry = {
    id: node.id,
    label: data.label,
    kind: data.kind === 'model' ? 'model' : 'task',
    percentage: data.percentage,
  }
  if (data.url) entry.url = data.url
  if (entry.kind === 'model' && data.messages?.length) entry.messages = data.messages
  return entry
}

export function collectParentHistory(nodeId: string, nodes: HistoryNode[], edges: HistoryEdge[]): NodeHistoryEntry[] {
  const byId = new Map(nodes.filter((node) => node && typeof node.id === 'string').map((node) => [node.id, node]))
  const parentsOf = new Map<string, string[]>()
  for (const edge of edges) {
    if (!edge?.source || !edge?.target) continue
    const parents = parentsOf.get(edge.target) ?? []
    if (!parents.includes(edge.source)) parents.push(edge.source)
    parentsOf.set(edge.target, parents)
  }
  const ordered: string[] = []
  const seen = new Set<string>()
  const stack = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id) || stack.has(id)) return
    stack.add(id)
    for (const parentId of parentsOf.get(id) ?? []) visit(parentId)
    stack.delete(id)
    seen.add(id)
    if (id !== nodeId) ordered.push(id)
  }
  visit(nodeId)
  return ordered.flatMap((id) => {
    const node = byId.get(id)
    return node ? [historyEntry(node)] : []
  })
}
