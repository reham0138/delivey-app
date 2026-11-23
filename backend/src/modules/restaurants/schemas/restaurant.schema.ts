import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'
import { Schema as MongooseSchema, Types } from 'mongoose'

/**
 * Stored restaurant. NEVER return a document from a controller: the API shape (contract 3.4) is built by a
 * mapper that picks fields explicitly, so `ratingSum` and `ratingCount` can never leak.
 * (The global Mongoose plugin replaces any schema-level toJSON, so hiding fields on the schema does not work.)
 */
@Schema({ timestamps: true })
export class Restaurant {
  createdAt!: Date

  // One restaurant per owner. The auth module creates it when an owner registers.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId!: Types.ObjectId

  @Prop({ type: String, trim: true, default: '' })
  name!: string

  @Prop({ type: String, trim: true, default: '' })
  cuisine!: string

  @Prop({ type: String, trim: true, default: '' })
  address!: string

  @Prop({ type: String, trim: true, default: '' })
  phone!: string

  @Prop({ type: Number, min: 0, default: 30 })
  deliveryTimeMinutes!: number

  @Prop({ type: Number, min: 0, default: 0 })
  deliveryFee!: number

  @Prop({ type: Number, min: 0, default: 0 })
  minOrder!: number

  // The owner opens and closes the restaurant.
  @Prop({ type: Boolean, default: false })
  isOpen!: boolean

  // The admin approves restaurants: a new one stays inactive until then.
  @Prop({ type: Boolean, default: false })
  isActive!: boolean

  @Prop({ type: String, trim: true, maxlength: 2048, default: '' })
  image!: string

  @Prop({ type: String, trim: true, maxlength: 2048, default: null })
  cover!: string | null

  @Prop({ type: String, trim: true, default: '' })
  openingHours!: string

  // Rating counters. Only the reviews module changes them (atomic $inc). Never read from a request.
  // API rating = ratingSum / ratingCount (1 decimal, 0 when there are no reviews).
  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingSum!: number

  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingCount!: number
}

export type RestaurantDocument = HydratedDocument<Restaurant>
export const RestaurantSchema = SchemaFactory.createForClass(Restaurant)

for (const optionName of ['toJSON', 'toObject'] as const) {
  const options = RestaurantSchema.get(optionName)
  const globalTransform = options?.transform
  RestaurantSchema.set(optionName, {
    ...options,
    transform: (document, value, transformOptions) => {
      const serialized =
        typeof globalTransform === 'function'
          ? (globalTransform as unknown as (...args: unknown[]) => object)(
              document,
              value,
              transformOptions,
            )
          : value
      Reflect.deleteProperty(serialized, 'ratingSum')
      Reflect.deleteProperty(serialized, 'ratingCount')
      return serialized
    },
  })
}

// Public list: active restaurants, optionally only the open ones.
RestaurantSchema.index({ isActive: 1, isOpen: 1 })
