/**
 * TEMPORARY mock compatibility helper.
 *
 * Shared types now use string ids (the API returns 24-char hex ObjectIds),
 * while the JSON fixtures in public/mock still contain numeric ids.
 * Call normalizeMockIds() on every parsed mock payload so `id` / `*Id`
 * fields become strings recursively.
 *
 * REMOVE THIS when the owning mock service is connected to the real API —
 * the API already returns string ids, so the helper becomes a no-op pass
 * that only adds noise.
 */
const ID_KEY = /^(id|[A-Za-z_]*Id)$/

export function normalizeMockIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMockIds(item)) as T
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(source)) {
      if (ID_KEY.test(key) && typeof entry === 'number') {
        result[key] = String(entry)
      } else {
        result[key] = normalizeMockIds(entry)
      }
    }
    return result as T
  }
  return value
}
