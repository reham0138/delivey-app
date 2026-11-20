import { HttpStatus } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'
import { AppException } from '../errors/app.exception'
import { ErrorCode } from '../errors/error-codes.enum'
import { PaginationQueryDto } from '../dto/pagination-query.dto'
import { paginate } from '../utils/pagination.util'

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter()
  let json: jest.Mock
  let status: jest.Mock

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (code: number) => {
          status(code)
          return { json }
        },
      }),
    }),
  } as never

  beforeEach(() => {
    json = jest.fn()
    status = jest.fn()
  })

  it('returns the contract shape for AppException', () => {
    filter.catch(new AppException(HttpStatus.BAD_REQUEST, ErrorCode.ItemUnavailable, 'Meal is unavailable'), host)
    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'BAD_REQUEST',
      code: 'ITEM_UNAVAILABLE',
      message: 'Meal is unavailable',
    })
  })

  it('maps unknown errors to 500 without leaking details', () => {
    filter.catch(new Error('db exploded'), host)
    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      code: 'VALIDATION_ERROR',
      message: 'Internal server error',
    })
  })
})

describe('paginate', () => {
  const query = Object.assign(new PaginationQueryDto(), { page: 2, limit: 10 })

  it('returns the contract envelope', () => {
    const result = paginate([1, 2], 25, query)
    expect(result).toEqual({
      data: [1, 2],
      meta: { total: 25, page: 2, limit: 10, total_pages: 3 },
    })
  })

  it('keeps total_pages at least 1', () => {
    const result = paginate([], 0, query)
    expect(result.meta.total_pages).toBe(1)
  })
})
