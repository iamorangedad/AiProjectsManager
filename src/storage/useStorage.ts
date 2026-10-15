import { useEffect, useState, useCallback, useRef } from 'react'
import { idbGet, idbSet, requestPersistent } from './idb'
import { pickSnapshot, type Snapshot } from './pickSnapshot'

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
        return [{ ...node, position }]
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

function lsSet(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    localStorage.setItem(META_KEY, String(Date.now()))
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

function chromeSetLocal(projects: Project[]) {
  if (!hasChromeLocal()) return
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: projects, [META_KEY]: Date.now() })
  } catch {}
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

async function loadBest(): Promise<{ projects: Project[] | null; readsOk: boolean }> {
  const [local, sync, idb, ls] = await Promise.all([chromeGet('local'), chromeGet('sync'), readIdb(), Promise.resolve(lsGet())])
  return pickSnapshot([local, sync, idb, ls])
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
  const [writable, setWritable] = useState(true)
  const loadedRef = useRef(false)
  const canWrite = useRef(false)

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
      const { projects: best, readsOk } = loadedSnapshot
      canWrite.current = readsOk
      setWritable(readsOk)
      if (best && best.length > 0) {
        setProjects(best)
        if (readsOk) persistAll(best)
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

  const persist = useCallback((next: Project[]) => {
    setProjects(next)
    if (!canWrite.current) return
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

  return { projects, loaded, writable, setProjects: persist, addProject, createProject, deleteProject, updateProject, renameProject, exportProjects, importProjects }
}
