import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument, Schema as MongooseSchema } from 'mongoose'
import { Types } from 'mongoose'

@Schema({ _id: false })
export class MenuItemNutrition {
  @Prop({ type: Number, min: 0, required: true })
  calories!: number

  @Prop({ type: Number, min: 0, required: true })
  protein!: number

  @Prop({ type: Number, min: 0, required: true })
  carbs!: number

  @Prop({ type: Number, min: 0, required: true })
  fat!: number
}

const MenuItemNutritionSchema = SchemaFactory.createForClass(MenuItemNutrition)

@Schema()
export class MenuItem {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: Types.ObjectId

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string

  @Prop({ type: String, required: true, trim: true, maxlength: 500 })
  description!: string

  @Prop({ type: Number, required: true, min: 0 })
  price!: number

  // The API accepts a category name; persistence uses the category reference.
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId!: Types.ObjectId

  @Prop({ type: String, trim: true, maxlength: 2048, default: null })
  image!: string | null

  @Prop({ type: Boolean, default: true })
  isAvailable!: boolean

  @Prop({ type: [String], required: true })
  ingredients!: string[]

  @Prop({ type: Number, min: 0, required: true })
  preparationTimeMinutes!: number

  @Prop({ type: MenuItemNutritionSchema, default: null })
  nutrition!: MenuItemNutrition | null

  @Prop({ type: Boolean, default: false })
  isPopular!: boolean

  // Internal soft-delete and rating fields are omitted from normal queries and API mapping.
  @Prop({ type: Boolean, default: true, select: false })
  isActive!: boolean

  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingSum!: number

  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingCount!: number
}

export type MenuItemDocument = HydratedDocument<MenuItem>
export const MenuItemSchema = SchemaFactory.createForClass(MenuItem)

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

hideFields(MenuItemSchema, ['categoryId', 'isActive', 'ratingSum', 'ratingCount'])
