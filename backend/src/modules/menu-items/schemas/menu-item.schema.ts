import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'
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

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: Types.ObjectId

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string

  @Prop({ type: String, required: true, trim: true, maxlength: 500 })
  description!: string

  @Prop({ type: Number, required: true, min: 0 })
  price!: number

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, select: false })
  categoryId!: Types.ObjectId

  @Prop({ type: String, trim: true, maxlength: 2048, default: null })
  image!: string | null

  @Prop({ type: Boolean, default: true })
  isAvailable!: boolean

  @Prop({ type: [String], required: true, default: [] })
  ingredients!: string[]

  @Prop({ type: Number, min: 0, required: true })
  preparationTimeMinutes!: number

  @Prop({ type: MenuItemNutritionSchema, default: null })
  nutrition!: MenuItemNutrition | null

  @Prop({ type: Boolean, default: false })
  isPopular!: boolean

  @Prop({ type: Boolean, default: true, select: false })
  isActive!: boolean

  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingSum!: number

  @Prop({ type: Number, min: 0, default: 0, select: false })
  ratingCount!: number
}

export type MenuItemDocument = HydratedDocument<MenuItem>
export const MenuItemSchema = SchemaFactory.createForClass(MenuItem)

for (const optionName of ['toJSON', 'toObject'] as const) {
  const options = MenuItemSchema.get(optionName)
  const globalTransform = options?.transform
  MenuItemSchema.set(optionName, {
    ...options,
    transform: (document, value, transformOptions) => {
      const serialized =
        typeof globalTransform === 'function'
          ? globalTransform(document, value, transformOptions)
          : value
      for (const field of ['categoryId', 'isActive', 'ratingSum', 'ratingCount']) {
        Reflect.deleteProperty(serialized, field)
      }
      return serialized
    },
  })
}

MenuItemSchema.index({ restaurantId: 1, isActive: 1 })
MenuItemSchema.index({ categoryId: 1, isActive: 1 })
