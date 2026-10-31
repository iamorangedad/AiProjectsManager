import { useEffect, useState, useCallback, useRef } from 'react'
import { idbGet, idbSet, requestPersistent } from './idb'
import { mcpGet, mcpSet } from './mcpSync'
import { storedNodeData, type AppNodeData, type NodeKind } from './nodeData'
import { pickSnapshot, type Snapshot } from './pickSnapshot'

export { storedNodeData, type AppNodeData, type NodeKind }

const STORAGE_KEY = 'projects'
const META_KEY = 'projects_meta_ts'

declare const chrome: {
  storage: {
    local: {
      get: (keys: string[], cb: (r: Record<string, unknown>) => void) => void
      set: (v: Record<string, unknown>, cb?: () => void) => void
    }
    sync?: {
      get: (keys: string[], cb: (r: Record<string, unknown>) => void) => void
      set: (v: Record<string, unknown>, cb?: () => void) => void
    }
  }
  runtime?: { lastError?: { message?: string } }
}

function hasChromeLocal() {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}
function hasChromeSync() {
  return typeof chrome !== 'undefined' && !!chrome.storage?.sync
}

export interface AppNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: AppNodeData
}

export interface AppEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface Project {
  id: string
  name: string
  nodes: AppNode[]
  edges: AppEdge[]
}

function asProjects(value: unknown): Project[] | null {
  if (!Array.isArray(value)) return null
  const projects: Project[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const project = item as Project
    if (typeof project.id !== 'string' || typeof project.name !== 'string' || !Array.isArray(project.nodes) || !Array.isArray(project.edges)) return null
    projects.push({
      ...project,
      nodes: project.nodes.flatMap((node) => {
        if (!node || typeof node.id !== 'string') return []
        const position = node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number' ? node.position : { x: 0, y: 0 }
        const raw = node.data && typeof node.data === 'object' ? node.data : undefined
        return [{
          id: node.id,
          type: typeof node.type === 'string' ? node.type : 'custom',
          position,
          data: storedNodeData(raw),
        }]
      }),
      edges: project.edges.filter((edge) => edge && typeof edge.id === 'string' && typeof edge.source === 'string' && typeof edge.target === 'string'),
    })
  }
  return projects
}

function lsGet(): Snapshot<Project> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const tsRaw = localStorage.getItem(META_KEY)
    if (!raw) return { data: null, ts: 0, ok: true }
    const data = asProjects(JSON.parse(raw))
    return { data, ts: tsRaw ? Number(tsRaw) : 0, ok: data !== null || raw === 'null' }
  } catch {
    return { data: null, ts: 0, ok: false }
  }
}

function lsSet(projects: Project[], ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    localStorage.setItem(META_KEY, String(ts))
  } catch {}
}

function chromeGet(area: 'local' | 'sync'): Promise<Snapshot<Project>> {
  return new Promise((resolve) => {
    const storage = area === 'local' ? (hasChromeLocal() ? chrome.storage.local : null) : hasChromeSync() ? chrome.storage.sync : null
    if (!storage) return resolve({ data: null, ts: 0, ok: true })
    try {
      storage.get([STORAGE_KEY, META_KEY], (r) => {
        if (chrome.runtime?.lastError) return resolve({ data: null, ts: 0, ok: false })
        const data = asProjects(r?.[STORAGE_KEY])
        const ts = (r?.[META_KEY] as number) || 0
        const raw = r?.[STORAGE_KEY]
        resolve({ data, ts, ok: data !== null || raw == null })
      })
    } catch {
      resolve({ data: null, ts: 0, ok: false })
    }
  })
}

function chromeSetLocal(projects: Project[], ts: number) {
  if (!hasChromeLocal()) return
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: projects, [META_KEY]: ts })
  } catch {}
}

function chromeSetSync(projects: Project[], ts: number) {
  if (!hasChromeSync()) return
  try {
    const payload: Record<string, unknown> = { [STORAGE_KEY]: projects, [META_KEY]: ts }
    const bytes = JSON.stringify(projects).length
    if (bytes > 80000) return
    chrome.storage.sync!.set(payload)
  } catch {}
}

async function readIdb(): Promise<Snapshot<Project>> {
  try {
    const saved = await idbGet()
    if (!saved) return { data: null, ts: 0, ok: true }
    const data = asProjects(saved.data)
    return { data, ts: saved.ts, ok: data !== null }
  } catch {
    return { data: null, ts: 0, ok: false }
  }
}

async function readMcp(): Promise<Snapshot<Project>> {
  const remote = await mcpGet()
  if (!remote.data) return { data: null, ts: 0, ok: true }
  const data = asProjects(remote.data)
  if (!data) return { data: null, ts: 0, ok: true }
  return { data, ts: remote.ts, ok: true }
}

async function loadBest(): Promise<{ projects: Project[] | null; readsOk: boolean; ts: number }> {
  const [local, sync, idb, ls, mcp] = await Promise.all([chromeGet('local'), chromeGet('sync'), readIdb(), Promise.resolve(lsGet()), readMcp()])
  const picked = pickSnapshot([local, sync, idb, ls, mcp])
  const winner = [local, sync, idb, ls, mcp].find((candidate) => candidate.data === picked.projects)
  return { projects: picked.projects, readsOk: picked.readsOk, ts: winner?.ts ?? 0 }
}

function persistAll(projects: Project[], ts: number, opts?: { skipMcp?: boolean }) {
  chromeSetLocal(projects, ts)
  chromeSetSync(projects, ts)
  lsSet(projects, ts)
  void idbSet(projects, ts)
  if (!opts?.skipMcp) mcpSet(projects, ts)
}

function validateProjects(raw: unknown): Project[] | null {
  if (!Array.isArray(raw)) return null
  for (const p of raw as any[]) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) return null
  }
  return raw as Project[]
}

export function useStorage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)
  const [writable, setWritable] = useState(true)
  const [externalRev, setExternalRev] = useState(0)
  const loadedRef = useRef(false)
  const canWrite = useRef(false)
  const tsRef = useRef(0)

  useEffect(() => {
    void requestPersistent()
    let cancelled = false
    void (async () => {
      let loadedSnapshot = await loadBest()
      if (!loadedSnapshot.readsOk) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (cancelled) return
        loadedSnapshot = await loadBest()
      }
      if (cancelled) return
      const { projects: best, readsOk, ts } = loadedSnapshot
      canWrite.current = readsOk
      setWritable(readsOk)
      tsRef.current = ts
      if (best && best.length > 0) {
        setProjects(best)
        if (readsOk) persistAll(best, ts)
      } else {
        const init: Project = { id: 'p1', name: 'Project 1', nodes: [], edges: [] }
        setProjects([init])
      }
      loadedRef.current = true
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    let cancelled = false
    const timer = setInterval(() => {
      void (async () => {
        if (!canWrite.current) return
        const remote = await mcpGet()
        const data = remote.data ? asProjects(remote.data) : null
        if (cancelled || !data || remote.ts <= tsRef.current) return
        tsRef.current = remote.ts
        setProjects(data)
        setExternalRev((n) => n + 1)
        persistAll(data, remote.ts, { skipMcp: true })
      })()
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [loaded])

  const persist = useCallback((next: Project[]) => {
    const ts = Date.now()
    tsRef.current = ts
    setProjects(next)
    if (!canWrite.current) return
    persistAll(next, ts)
  }, [])

  const addProject = useCallback(
    (project: Project) => {
      const idx = projects.findIndex((p) => p.id === project.id)
      if (idx >= 0) {
        const copy = [...projects]
        copy[idx] = project
        persist(copy)
      } else {
        persist([...projects, project])
      }
    },
    [projects, persist],
  )

  const createProject = useCallback(
    (name?: string) => {
      const p: Project = { id: `p${Date.now()}`, name: name || `Project ${projects.length + 1}`, nodes: [], edges: [] }
      persist([...projects, p])
      return p
    },
    [projects, persist],
  )

  const deleteProject = useCallback(
    (projectId: string) => {
      const remaining = projects.filter((p) => p.id !== projectId)
      if (remaining.length === 0) {
        const init: Project = { id: 'p1', name: 'Project 1', nodes: [], edges: [] }
        persist([init])
      } else {
        persist(remaining)
      }
    },
    [projects, persist],
  )

  const updateProject = useCallback((updated: Project) => addProject(updated), [addProject])

  const renameProject = useCallback(
    (id: string, name: string) => {
      const copy = projects.map((p) => (p.id === id ? { ...p, name } : p))
      persist(copy)
    },
    [projects, persist],
  )

  const exportProjects = useCallback(() => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-projects-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [projects])

  const importProjects = useCallback(
    (incoming: Project[]) => {
      const v = validateProjects(incoming)
      if (!v) throw new Error('invalid format')
      persist(v)
    },
    [persist],
  )

  return { projects, loaded, writable, externalRev, setProjects: persist, addProject, createProject, deleteProject, updateProject, renameProject, exportProjects, importProjects }
}
