const SEARCH_API_URL =
  import.meta.env.VITE_SEARCH_API_URL ?? 'http://127.0.0.1:8000'

export interface SemanticSearchResult<T> {
  id: string
  score: number
  item: T
}

interface SemanticSearchResponse<T> {
  query: string
  total: number
  results: SemanticSearchResult<T>[]
}

/**
 * Ranks the meals currently shown in the app with the shared semantic
 * search API, so meals edited in localStorage are searched as well.
 * Meals may include localizedName / localizedCategory for Arabic queries.
 */
export async function searchMealsSemantically<T extends { id: number }>(
  query: string,
  meals: T[],
  signal?: AbortSignal
): Promise<SemanticSearchResult<T>[]> {
  if (meals.length === 0) return []

  const response = await fetch(`${SEARCH_API_URL}/search/delivery-meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, items: meals }),
    signal,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Semantic search API failed (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as SemanticSearchResponse<T>
  return data.results
}
