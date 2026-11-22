import 'reflect-metadata'
import type { FilterQuery } from 'mongoose'
import { OrdersService } from './orders.service'
import type { OrderDocument } from './order.schema'
import { escapeRegex } from './utils/escape-regex'

describe('escapeRegex', () => {
  it('escapes regex special characters', () => {
    expect(escapeRegex('.*')).toBe('\\.\\*')
    expect(escapeRegex('(a+)+$')).toBe('\\(a\\+\\)\\+\\$')
    expect(escapeRegex('a[b]c^d|e')).toBe('a\\[b\\]c\\^d\\|e')
    expect(escapeRegex('plain text')).toBe('plain text')
  })
})

describe('order search filter', () => {
  function buildFilter(search: string) {
    const service = new OrdersService({} as never, {} as never, {} as never)
    const exposed = service as unknown as {
      buildOrderListFilter: (query: { search?: string }) => FilterQuery<OrderDocument>
    }
    return exposed.buildOrderListFilter({ search })
  }

  it('escapes user input in the item-name regex', () => {
    const filter = buildFilter('.*')
    const or = filter.$or as Array<Record<string, { $regex?: unknown }>>
    expect(or[0]['items.name'].$regex).toBe('\\.\\*')
  })

  it('escapes user input in the order-id tail regex', () => {
    const filter = buildFilter('abc123(+)')
    const or = filter.$or as Array<{
      $expr?: { $regexMatch?: { regex?: string } }
    }>
    const tailPattern = or[1].$expr?.$regexMatch?.regex
    expect(tailPattern).toBe('123\\(\\+\\)$')
    expect(tailPattern).not.toContain('(+)')
  })
})
