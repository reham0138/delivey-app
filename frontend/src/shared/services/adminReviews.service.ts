import { apiRequest } from '@/shared/api/client'
import type { PaginatedResponse, Review } from '@/shared/types'

/** Contract 3.11 AdminReviewRow — the API adds `isHidden`; names are joined client-side. */
export type AdminReviewRow = Review & { isHidden: boolean }

export interface AdminReviewsListQuery {
  page: number
  limit: number
  reported?: boolean
  isHidden?: boolean
}

export interface ReviewLookups {
  restaurants: { id: string; name: string }[]
  meals: { id: string; name: string }[]
}

const PAGE_LIMIT = 50

async function getAllPages<T>(path: string): Promise<T[]> {
  const firstPage = await apiRequest<PaginatedResponse<T>>(path, {
    query: { page: 1, limit: PAGE_LIMIT },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const next = await apiRequest<PaginatedResponse<T>>(path, {
      query: { page, limit: PAGE_LIMIT },
    })
    data.push(...next.data)
  }
  return data
}

export const adminReviewsService = {
  listReviewsPage(query: AdminReviewsListQuery): Promise<PaginatedResponse<AdminReviewRow>> {
    return apiRequest<PaginatedResponse<AdminReviewRow>>('/admin/reviews', {
      query: {
        page: query.page,
        limit: query.limit,
        reported: query.reported,
        isHidden: query.isHidden,
      },
    })
  },

  /** Restaurant and meal names for display — the reviews endpoint does not join them. */
  async listLookups(): Promise<ReviewLookups> {
    const [restaurants, meals] = await Promise.all([
      getAllPages<{ id: string; name: string }>('/admin/restaurants'),
      getAllPages<{ id: string; name: string }>('/admin/menu-items'),
    ])
    return {
      restaurants: restaurants.map((r) => ({ id: r.id, name: r.name })),
      meals: meals.map((m) => ({ id: m.id, name: m.name })),
    }
  },

  hideReview(id: string): Promise<AdminReviewRow> {
    return apiRequest<AdminReviewRow>(`/admin/reviews/${encodeURIComponent(id)}/hide`, {
      method: 'POST',
    })
  },

  dismissReport(id: string): Promise<AdminReviewRow> {
    return apiRequest<AdminReviewRow>(`/admin/reviews/${encodeURIComponent(id)}/dismiss-report`, {
      method: 'POST',
    })
  },
}
