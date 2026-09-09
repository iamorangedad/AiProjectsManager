import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'projects'

declare const chrome: {
  storage: {
    local: {
      get: (keys: string[], cb: (r: Record<string, unknown>) => void) => void
      set: (v: Record<string, unknown>, cb?: () => void) => void
    }
  }
}

function isChromeAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
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

function fallbackLoad(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Project[]
  } catch {}
  return []
}

function fallbackSave(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {}
}

export function useStorage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (isChromeAvailable()) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const stored = result[STORAGE_KEY] as Project[] | undefined
        if (stored && Array.isArray(stored) && stored.length > 0) {
          setProjects(stored)
        } else {
          const init: Project = { id: 'p1', name: 'Project 1', nodes: [], edges: [] }
          setProjects([init])
          chrome.storage.local.set({ [STORAGE_KEY]: [init] })
        }
        setLoaded(true)
      })
    } else {
      const stored = fallbackLoad()
      if (stored.length > 0) setProjects(stored)
      else {
        const init: Project = { id: 'p1', name: 'Project 1', nodes: [], edges: [] }
        setProjects([init])
        fallbackSave([init])
      }
      setLoaded(true)
    }
  }, [])

  const persist = useCallback((next: Project[]) => {
    setProjects(next)
    if (isChromeAvailable()) chrome.storage.local.set({ [STORAGE_KEY]: next })
    else fallbackSave(next)
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
      const p: Project = {
        id: `p${Date.now()}`,
        name: name || `Project ${projects.length + 1}`,
        nodes: [],
        edges: [],
      }
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

  const updateProject = useCallback(
    (updated: Project) => addProject(updated),
    [addProject],
  )

  const renameProject = useCallback(
    (id: string, name: string) => {
      const copy = projects.map((p) => (p.id === id ? { ...p, name } : p))
      persist(copy)
    },
    [projects, persist],
  )

  return { projects, loaded, setProjects: persist, addProject, createProject, deleteProject, updateProject, renameProject }
}
