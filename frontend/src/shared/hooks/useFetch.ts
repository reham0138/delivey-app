import { useCallback, useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Runs an async function and tracks loading / error / data.
 * `fetcher` must be stable (wrap it in useCallback), otherwise it re-runs on every render.
 *
 * - retry():   reload and show the loading state again (use after an error).
 * - refresh(): reload quietly; the screen keeps its data, and a failed refresh is ignored.
 */
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })
  const [request, setRequest] = useState({ id: 0, silent: false })

  useEffect(() => {
    let ignore = false // drop the answer if the component left or a newer request started
    fetcher()
      .then((data) => {
        if (!ignore) setState({ data, loading: false, error: null })
      })
      .catch((reason: unknown) => {
        if (ignore) return
        setState((current) =>
          request.silent && current.data
            ? current
            : { data: null, loading: false, error: reason instanceof Error ? reason.message : 'Unable to load data.' },
        )
      })
    return () => {
      ignore = true
    }
  }, [fetcher, request])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }))
    setRequest((current) => ({ id: current.id + 1, silent: false }))
  }, [])

  const refresh = useCallback(() => {
    setRequest((current) => ({ id: current.id + 1, silent: true }))
  }, [])

  return { ...state, retry, refresh }
}