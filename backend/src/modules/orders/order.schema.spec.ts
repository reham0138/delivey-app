import { describe, expect, it } from '@jest/globals'
import { OrderSchema } from './order.schema'

describe('OrderSchema', () => {
  it('defines the customer and restaurant indexes', () => {
    expect(OrderSchema.indexes()).toContainEqual([
      { customerId: 1, createdAt: -1 },
      expect.objectContaining({}),
    ])
    expect(OrderSchema.indexes()).toContainEqual([
      { restaurantId: 1, status: 1, createdAt: -1 },
      expect.objectContaining({}),
    ])
  })
})
