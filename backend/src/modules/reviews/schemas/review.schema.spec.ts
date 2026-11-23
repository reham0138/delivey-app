import { describe, expect, it } from '@jest/globals'
import { ReviewSchema } from './review.schema'

describe('ReviewSchema', () => {
  it('defines a unique customer and menu-item index', () => {
    expect(ReviewSchema.indexes()).toContainEqual([
      { customerId: 1, menuItemId: 1 },
      expect.objectContaining({ unique: true }),
    ])
  })

  it('limits comments to 500 characters', () => {
    expect(ReviewSchema.path('comment').options.maxlength).toBe(500)
  })

  it('stores report and hidden moderation fields', () => {
    expect(ReviewSchema.path('isReported')).toBeDefined()
    expect(ReviewSchema.path('isHidden')).toBeDefined()
  })
})
