import { useCallback, useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Runs an async function and tracks loading / error / data.
 * `fetcher` must be stable (wrap it in useCallback), otherwise it re-runs on every render.
 */
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false // drop the answer if the component left or the inputs changed meanwhile
    fetcher()
      .then((data) => {
        if (!ignore) setState({ data, loading: false, error: null })
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setState({ data: null, loading: false, error: reason instanceof Error ? reason.message : 'Unable to load data.' })
        }
      })
    return () => {
      ignore = true
    }
  }, [fetcher, attempt])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }))
    setAttempt((count) => count + 1)
  }, [])

  return { ...state, retry }
}
