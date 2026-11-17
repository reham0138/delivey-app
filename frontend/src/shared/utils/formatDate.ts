/** Date only, e.g. "Nov 3, 2026". For date + time use formatDateTime from format.ts. */
export function formatDate(value: string | Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(value),
  )
}