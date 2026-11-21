import { validate } from 'class-validator'
import mongoose, { Types } from 'mongoose'
import { CreateMenuItemDto } from './dto/menu-item.dto'
import { mapMenuItem } from './menu-items.service'
import { MenuItemSchema } from './schemas/menu-item.schema'
import { UpdateRestaurantDto } from '../restaurants/dto/list-restaurants-query.dto'
import { mapRestaurant } from '../restaurants/restaurants.service'
import { RestaurantSchema } from '../restaurants/schemas/restaurant.schema'

describe('catalog response and request contract', () => {
  it('computes ratings to one decimal and omits internal menu-item fields', () => {
    const response = mapMenuItem({
      _id: new Types.ObjectId(),
      restaurantId: new Types.ObjectId(),
      name: 'Meal',
      description: 'Description',
      price: 4.5,
      image: null,
      isAvailable: true,
      ingredients: [],
      preparationTimeMinutes: 5,
      nutrition: null,
      isPopular: false,
      ratingSum: 13,
      ratingCount: 3,
      categoryName: 'Sides',
    })

    expect(response.rating).toBe(4.3)
    expect(response.reviewsCount).toBe(3)
    expect(response).not.toHaveProperty('ratingSum')
    expect(response).not.toHaveProperty('ratingCount')
    expect(response).not.toHaveProperty('categoryId')
    expect(response).not.toHaveProperty('isActive')
  })

  it('computes restaurant ratings and omits internal counters', () => {
    const response = mapRestaurant({
      _id: new Types.ObjectId(),
      ownerId: new Types.ObjectId(),
      name: 'Restaurant',
      cuisine: 'Cuisine',
      address: '',
      phone: '',
      deliveryTimeMinutes: 30,
      deliveryFee: 0,
      minOrder: 0,
      isOpen: false,
      isActive: false,
      image: '',
      cover: '',
      openingHours: '',
      ratingSum: 9,
      ratingCount: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    expect(response.rating).toBe(4.5)
    expect(response.reviewsCount).toBe(2)
    expect(response).not.toHaveProperty('ratingSum')
    expect(response).not.toHaveProperty('ratingCount')
  })

  it('does not serialize internal schema fields', () => {
    const restaurantModel = mongoose.model('CatalogContractRestaurant', RestaurantSchema)
    const menuItemModel = mongoose.model('CatalogContractMenuItem', MenuItemSchema)
    const restaurant = new restaurantModel({
      ownerId: new Types.ObjectId(),
      ratingSum: 10,
      ratingCount: 2,
    })
    const menuItem = new menuItemModel({
      restaurantId: new Types.ObjectId(),
      categoryId: new Types.ObjectId(),
      name: 'Meal',
      description: 'Description',
      price: 1,
      ingredients: [],
      preparationTimeMinutes: 1,
      isActive: false,
      ratingSum: 10,
      ratingCount: 2,
    })

    expect(restaurant.toJSON()).not.toHaveProperty('ratingSum')
    expect(restaurant.toJSON()).not.toHaveProperty('ratingCount')
    expect(menuItem.toJSON()).not.toHaveProperty('categoryId')
    expect(menuItem.toJSON()).not.toHaveProperty('isActive')
    expect(menuItem.toJSON()).not.toHaveProperty('ratingSum')
    expect(menuItem.toJSON()).not.toHaveProperty('ratingCount')
  })

  it('rejects request attempts to set server-controlled catalog fields', async () => {
    const menuDto = Object.assign(new CreateMenuItemDto(), {
      name: 'Meal',
      description: 'Description',
      price: 1,
      category: 'Sides',
      ingredients: [],
      preparationTimeMinutes: 1,
      restaurantId: new Types.ObjectId().toString(),
      isActive: false,
      ratingSum: 20,
      ratingCount: 4,
    })
    const restaurantDto = Object.assign(new UpdateRestaurantDto(), {
      ownerId: new Types.ObjectId().toString(),
      isActive: true,
      ratingCount: 4,
    })
    const options = { whitelist: true, forbidNonWhitelisted: true }

    const [menuErrors, restaurantErrors] = await Promise.all([
      validate(menuDto, options),
      validate(restaurantDto, options),
    ])

    expect(menuErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['restaurantId', 'isActive', 'ratingSum', 'ratingCount']),
    )
    expect(restaurantErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['ownerId', 'isActive', 'ratingCount']),
    )
  })
})
