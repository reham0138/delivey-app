import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminUsersService } from '@/shared/services/adminUsers.service'
import { apiRequest, ApiError } from '@/shared/api/client'
import type { AdminUserRow } from '@/shared/services/adminUsers.service'
import type { PaginatedResponse } from '@/shared/types'

vi.mock('@/shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/client')>()
  return { ...actual, apiRequest: vi.fn() }
})

const apiRequestMock = vi.mocked(apiRequest)

const user: AdminUserRow = {
  id: '64b0f1c2e4b0a1d2c3e4f501',
  name: 'Layla Hassan',
  email: 'layla@example.com',
  phone: '+971500000000',
  role: 'customer',
  status: 'active',
  createdAt: '2026-01-15T10:00:00.000Z',
}

function pageOf(rows: AdminUserRow[], page = 1, totalPages = 1): PaginatedResponse<AdminUserRow> {
  return { data: rows, meta: { total: rows.length, page, limit: 50, total_pages: totalPages } }
}

describe('adminUsersService.listUsers', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('requests /admin/users with the query params and returns the page', async () => {
    apiRequestMock.mockResolvedValue(pageOf([user]))

    const result = await adminUsersService.listUsers({
      page: 2,
      limit: 8,
      search: 'layla',
      role: 'customer',
      status: 'active',
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users', {
      query: { page: 2, limit: 8, search: 'layla', role: 'customer', status: 'active' },
    })
    expect(result.data).toEqual([user])
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, total_pages: 1 })
  })

  it('passes undefined filters through so the client omits them', async () => {
    apiRequestMock.mockResolvedValue(pageOf([]))

    await adminUsersService.listUsers({ page: 1, limit: 8 })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users', {
      query: { page: 1, limit: 8, search: undefined, role: undefined, status: undefined },
    })
  })

  it('returns an empty page with zeroed meta', async () => {
    apiRequestMock.mockResolvedValue({ data: [], meta: { total: 0, page: 3, limit: 8, total_pages: 0 } })

    const result = await adminUsersService.listUsers({ page: 3, limit: 8, search: 'nobody' })

    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
    expect(result.meta.total_pages).toBe(0)
  })

  it('propagates a FORBIDDEN error unchanged', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'You cannot modify your own account'))
    await expect(adminUsersService.listUsers({ page: 1, limit: 8 })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  })

  it('propagates a NOT_FOUND error unchanged', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'User not found'))
    await expect(adminUsersService.listUsers({ page: 1, limit: 8 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })
})

describe('adminUsersService.setUserStatus', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('PATCHes the status endpoint with the encoded id and returns the row', async () => {
    apiRequestMock.mockResolvedValue({ ...user, status: 'suspended' })

    const result = await adminUsersService.setUserStatus(user.id, 'suspended')

    expect(apiRequestMock).toHaveBeenCalledWith(`/admin/users/${user.id}/status`, {
      method: 'PATCH',
      body: { status: 'suspended' },
    })
    expect(result.status).toBe('suspended')
  })

  it('encodes the id in the path', async () => {
    apiRequestMock.mockResolvedValue(user)

    await adminUsersService.setUserStatus('id/with space', 'active')

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/id%2Fwith%20space/status', {
      method: 'PATCH',
      body: { status: 'active' },
    })
  })

  it('propagates a FORBIDDEN error', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Admin accounts cannot be modified'))
    await expect(adminUsersService.setUserStatus(user.id, 'suspended')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('propagates a NOT_FOUND error', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'User not found'))
    await expect(adminUsersService.setUserStatus(user.id, 'active')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('adminUsersService.listAllUsers', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('follows meta.total_pages and concatenates every page', async () => {
    const other: AdminUserRow = { ...user, id: 'other', email: 'other@example.com' }
    apiRequestMock
      .mockResolvedValueOnce(pageOf([user], 1, 2))
      .mockResolvedValueOnce({ data: [other], meta: { total: 2, page: 2, limit: 50, total_pages: 2 } })

    const result = await adminUsersService.listAllUsers()

    expect(apiRequestMock).toHaveBeenCalledTimes(2)
    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/users', {
      query: { page: 1, limit: 50, search: undefined, role: undefined, status: undefined },
    })
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/admin/users', {
      query: { page: 2, limit: 50, search: undefined, role: undefined, status: undefined },
    })
    expect(result).toEqual([user, other])
  })
})
