import mongoose from 'mongoose'
import { SessionSchema } from '../modules/auth/schemas/session.schema'
import { MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { RestaurantSchema } from '../modules/restaurants/schemas/restaurant.schema'

// Regression test: @Prop({ type: Types.ObjectId }) resolves to Mixed and
// string ids are never cast. Reference props must use Schema.Types.ObjectId.
describe('ObjectId reference props', () => {
  it('declares ObjectId paths, not Mixed', () => {
    const cases: Array<[string, mongoose.Schema, string[]]> = [
      ['ObjectIdCheckRestaurant', RestaurantSchema, ['ownerId']],
      ['ObjectIdCheckMenuItem', MenuItemSchema, ['restaurantId', 'categoryId']],
      ['ObjectIdCheckSession', SessionSchema, ['userId']],
    ]

    for (const [name, schema, fields] of cases) {
      const model = mongoose.model(name, schema)
      for (const field of fields) {
        expect(model.schema.path(field)?.instance).toBe('ObjectId')
      }
    }
  })
})
