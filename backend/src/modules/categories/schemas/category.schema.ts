import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'

@Schema()
export class Category {
  @Prop({ type: String, required: true, trim: true, maxlength: 60 })
  name!: string

  // Categories are never deleted, only deactivated (contract section 8).
  @Prop({ type: Boolean, default: true })
  isActive!: boolean
}

export type CategoryDocument = HydratedDocument<Category>
export const CategorySchema = SchemaFactory.createForClass(Category)

// "Burgers" and "burgers" are the same category: strength 2 makes the unique index case-insensitive.
// A duplicate raises Mongo error 11000, which the service turns into 409 CATEGORY_NAME_TAKEN.
CategorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
