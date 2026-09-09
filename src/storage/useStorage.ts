import { useEffect, useState, useCallback, useRef } from 'react'
import { idbGet, idbSet, requestPersistent } from './idb'

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
  data: { label: string; url?: string; percentage: number }
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

function lsGet(): { data: Project[] | null; ts: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const tsRaw = localStorage.getItem(META_KEY)
    if (!raw) return { data: null, ts: 0 }
    return { data: JSON.parse(raw) as Project[], ts: tsRaw ? Number(tsRaw) : 0 }
  } catch {
    return { data: null, ts: 0 }
  }
}

function lsSet(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    localStorage.setItem(META_KEY, String(Date.now()))
  } catch {}
}

function chromeGetLocal(): Promise<{ data: Project[] | null; ts: number }> {
  return new Promise((resolve) => {
    if (!hasChromeLocal()) return resolve({ data: null, ts: 0 })
    try {
      chrome.storage.local.get([STORAGE_KEY, META_KEY], (r) => {
        const data = r[STORAGE_KEY] as Project[] | undefined
        const ts = (r[META_KEY] as number) || 0
        if (!data || !Array.isArray(data)) resolve({ data: null, ts: 0 })
        else resolve({ data, ts })
      })
    } catch {
      resolve({ data: null, ts: 0 })
    }
  })
}

function chromeSetLocal(projects: Project[]) {
  if (!hasChromeLocal()) return
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: projects, [META_KEY]: Date.now() })
  } catch {}
}

function chromeGetSync(): Promise<{ data: Project[] | null; ts: number }> {
  return new Promise((resolve) => {
    if (!hasChromeSync()) return resolve({ data: null, ts: 0 })
    try {
      chrome.storage.sync!.get([STORAGE_KEY, META_KEY], (r) => {
        const data = r[STORAGE_KEY] as Project[] | undefined
        const ts = (r[META_KEY] as number) || 0
        if (!data || !Array.isArray(data)) resolve({ data: null, ts: 0 })
        else resolve({ data, ts })
      })
    } catch {
      resolve({ data: null, ts: 0 })
    }
  })
}

function chromeSetSync(projects: Project[]) {
  if (!hasChromeSync()) return
  try {
    const payload: Record<string, unknown> = { [STORAGE_KEY]: projects, [META_KEY]: Date.now() }
    const bytes = JSON.stringify(projects).length
    if (bytes > 80000) return
    chrome.storage.sync!.set(payload)
  } catch {}
}

function pickBest(candidates: Array<{ data: Project[] | null; ts: number; src: string }>): Project[] | null {
  const valid = candidates.filter((c) => c.data && Array.isArray(c.data) && c.data.length > 0) as Array<{ data: Project[]; ts: number; src: string }>
  if (valid.length === 0) return null
  valid.sort((a, b) => {
    if (b.ts !== a.ts) return b.ts - a.ts
    const al = a.data.reduce((s, p) => s + p.nodes.length + p.edges.length, 0)
    const bl = b.data.reduce((s, p) => s + p.nodes.length + p.edges.length, 0)
    return bl - al
  })
  return valid[0].data
}

async function loadBest(): Promise<Project[] | null> {
  const [local, sync, idb, ls] = await Promise.all([chromeGetLocal(), chromeGetSync(), idbGet().then((r) => (r ? { data: r.data as Project[], ts: r.ts } : { data: null, ts: 0 })), Promise.resolve(lsGet())])
  const best = pickBest([
    { data: local.data, ts: local.ts, src: 'local' },
    { data: sync.data, ts: sync.ts, src: 'sync' },
    { data: idb.data as Project[] | null, ts: idb.ts, src: 'idb' },
    { data: ls.data, ts: ls.ts, src: 'ls' },
  ])
  return best
}

function persistAll(projects: Project[]) {
  chromeSetLocal(projects)
  chromeSetSync(projects)
  lsSet(projects)
  void idbSet(projects)
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
  const loadedRef = useRef(false)

  useEffect(() => {
    void requestPersistent()
    let cancelled = false
    void (async () => {
      const best = await loadBest()
      if (cancelled) return
      if (best && best.length > 0) {
        setProjects(best)
        persistAll(best)
      } else {
        const init: Project = { id: 'p1', name: 'Project 1', nodes: [], edges: [] }
        setProjects([init])
        persistAll([init])
      }
      loadedRef.current = true
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next: Project[]) => {
    setProjects(next)
    persistAll(next)
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

  return { projects, loaded, setProjects: persist, addProject, createProject, deleteProject, updateProject, renameProject, exportProjects, importProjects }
}
