import 'reflect-metadata'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'
import { ReviewsController } from './reviews.controller'

describe('ReviewsController public routes', () => {
  const reflector = new Reflector()
  const proto = ReviewsController.prototype as unknown as Record<string, unknown>

  it.each(['findPublicForMenuItem', 'findPublicForRestaurant'])('%s is @Public', (handler) => {
    expect(reflector.get(IS_PUBLIC_KEY, proto[handler] as never)).toBe(true)
  })

  it.each([
    'create',
    'findMine',
    'findForRestaurant',
    'reportForRestaurant',
    'findForAdmin',
    'hide',
    'dismissReport',
  ])('%s stays protected', (handler) => {
    expect(reflector.get(IS_PUBLIC_KEY, proto[handler] as never)).toBeUndefined()
  })
})
