export type CollapseEdge = { source: string; target: string }

export function hiddenDescendantIds(edges: CollapseEdge[], collapsedIds: Iterable<string>): Set<string> {
  const children = new Map<string, string[]>()
  for (const edge of edges) {
    const list = children.get(edge.source)
    if (list) list.push(edge.target)
    else children.set(edge.source, [edge.target])
  }
  const hidden = new Set<string>()
  const queue = [...collapsedIds]
  const visited = new Set<string>(queue)
  while (queue.length) {
    const current = queue.shift()!
    for (const child of children.get(current) ?? []) {
      if (!hidden.has(child)) hidden.add(child)
      if (!visited.has(child)) {
        visited.add(child)
        queue.push(child)
      }
    }
  }
  return hidden
}

export function mergeDraggedNodes<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  dragged: { id: string; position?: { x: number; y: number } }[],
): T[] {
  const byId = new Map(dragged.map((node) => [node.id, node]))
  return nodes.map((node) => {
    const update = byId.get(node.id)
    const position = update?.position
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return node
    if (position.x === node.position.x && position.y === node.position.y) return node
    return { ...node, position: { x: position.x, y: position.y } }
  })
}
