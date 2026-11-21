import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument, Schema as MongooseSchema } from 'mongoose'
import { Types } from 'mongoose'

/**
 * Stored restaurant. API responses are built by a mapper; the serialization transform also
 * removes rating counters so they cannot leak if a document is serialized directly.
 */
@Schema()
export class Restaurant {
  createdAt!: Date

  // One restaurant per owner. The auth module creates it when an owner registers.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
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

  @Prop({ type: String, trim: true, maxlength: 2048, default: '' })
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

function hideFields(schema: MongooseSchema, fields: readonly string[]): void {
  for (const optionName of ['toJSON', 'toObject'] as const) {
    const options = schema.get(optionName)
    schema.set(optionName, {
      ...options,
      virtuals: true,
      transform: (_doc, ret) => {
        const rawId = ret._id
        if (rawId !== undefined && rawId !== null) {
          Object.assign(ret, {
            id: typeof rawId === 'object' && 'toString' in rawId ? String(rawId) : rawId,
          })
        }
        Reflect.deleteProperty(ret, '_id')
        Reflect.deleteProperty(ret, '__v')
        for (const field of fields) Reflect.deleteProperty(ret, field)
        return ret
      },
    })
  }
}

hideFields(RestaurantSchema, ['ratingSum', 'ratingCount'])

// Public list: active restaurants, optionally only the open ones.
RestaurantSchema.index({ isActive: 1, isOpen: 1 })
