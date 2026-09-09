const DB_NAME = 'ai-projects-manager'
const DB_VERSION = 1
const STORE = 'kv'
const KEY = 'projects'
const META_KEY = 'projects_meta'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}

export async function idbGet(): Promise<{ data: unknown; ts: number } | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get(KEY)
      req.onsuccess = () => {
        const data = req.result as unknown
        const metaReq = store.get(META_KEY)
        metaReq.onsuccess = () => {
          const ts = (metaReq.result as number) || 0
          db.close()
          if (data === undefined) resolve(null)
          else resolve({ data, ts })
        }
        metaReq.onerror = () => {
          db.close()
          if (data === undefined) resolve(null)
          else resolve({ data, ts: 0 })
        }
      }
      req.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

export async function idbSet(data: unknown): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.put(data, KEY)
      store.put(Date.now(), META_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {}
}

export async function requestPersistent(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {}
}
