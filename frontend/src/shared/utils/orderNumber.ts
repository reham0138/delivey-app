/** User-facing order number: last 6 characters of the id, uppercase. */
export function orderNumber(id: string): string {
  return id.slice(-6).toUpperCase()
}
