export type Snapshot<T> = {
  data: T[] | null
  ts: number
  ok: boolean
}

type WithGraph = { nodes: unknown[]; edges: unknown[] }

export function contentScore(projects: WithGraph[]): number {
  return projects.reduce((sum, project) => sum + project.nodes.length + project.edges.length, 0)
}

/**
 * Choose which saved copy to show.
 * A newer copy that has no nodes and no edges must not hide an older copy that still has work.
 * `readsOk` is false when any store failed; callers must not write in that case.
 */
export function pickSnapshot<T extends WithGraph>(candidates: Snapshot<T>[]): { projects: T[] | null; readsOk: boolean } {
  const readsOk = candidates.every((candidate) => candidate.ok)
  const valid = candidates.filter((candidate): candidate is Snapshot<T> & { data: T[] } => Array.isArray(candidate.data) && candidate.data.length > 0)
  if (valid.length === 0) return { projects: null, readsOk }

  const ranked = [...valid].sort((a, b) => {
    const aScore = contentScore(a.data)
    const bScore = contentScore(b.data)
    if (aScore === 0 && bScore > 0) return 1
    if (bScore === 0 && aScore > 0) return -1
    if (b.ts !== a.ts) return b.ts - a.ts
    return bScore - aScore
  })

  return { projects: ranked[0].data, readsOk }
}
