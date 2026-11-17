import { useCallback, useState } from 'react'

/**
 * Runs one admin action (suspend a user, delete a review...) and remembers
 * which row is busy and what went wrong. `onSettled` reloads the list afterwards,
 * whether the action worked or not, so a stale screen corrects itself.
 */
export function useAdminAction(onSettled: () => void) {
  const [busyKey, setBusyKey] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (key: string | number, action: () => Promise<unknown>): Promise<boolean> => {
      setBusyKey(key)
      setError(null)
      try {
        await action()
        return true
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Something went wrong.')
        return false
      } finally {
        setBusyKey(null)
        onSettled()
      }
    },
    [onSettled],
  )

  const clearError = useCallback(() => setError(null), [])

  return { run, busyKey, error, clearError }
}   