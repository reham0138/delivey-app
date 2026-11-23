const STORAGE_VERSION_KEY = 'crown-anchor-storage-version'
const STORAGE_PREFIX = 'crown-anchor-'
const CURRENT_VERSION = '2'

/**
 * Runs once at startup, before React reads the cart or the session.
 * Version 2 switched all entity ids from numbers to strings; stale
 * localStorage payloads (numeric-id carts, mock users, old sessions)
 * are wiped so nothing mixes the two id shapes.
 */
export function ensureStorageVersion(): void {
  try {
    if (window.localStorage.getItem(STORAGE_VERSION_KEY) === CURRENT_VERSION) return
    const keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) window.localStorage.removeItem(key)
    window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION)
  } catch {
    // Storage unavailable (private mode etc.) — the app still works in memory.
  }
}
