import { apiRequest } from '@/shared/api/client'
import type { AccountStatus, PaginatedResponse, UserRole } from '@/shared/types'

/** Contract 3.11 AdminUserRow — the backend never returns passwordHash or addresses. */
export interface AdminUserRow {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  status: AccountStatus
  createdAt: string
}

export interface AdminUsersListQuery {
  page: number
  limit: number
  search?: string
  role?: UserRole
  status?: AccountStatus
}

export const adminUsersService = {
  listUsers(query: AdminUsersListQuery): Promise<PaginatedResponse<AdminUserRow>> {
    return apiRequest<PaginatedResponse<AdminUserRow>>('/admin/users', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        role: query.role,
        status: query.status,
      },
    })
  },

  /** Every user, page by page — used by the admin overview stats. */
  async listAllUsers(): Promise<AdminUserRow[]> {
    const firstPage = await adminUsersService.listUsers({ page: 1, limit: 50 })
    const data = [...firstPage.data]
    for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
      const next = await adminUsersService.listUsers({ page, limit: 50 })
      data.push(...next.data)
    }
    return data
  },

  setUserStatus(id: string, status: AccountStatus): Promise<AdminUserRow> {
    return apiRequest<AdminUserRow>(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    })
  },
}
