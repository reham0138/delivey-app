import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type ReviewDocument = HydratedDocument<Review>

@Schema()
export class Review {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  menuItemId: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  restaurantId: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  customerId: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  orderId: Types.ObjectId

  @Prop({ type: String, required: true })
  customerName: string

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number

  @Prop({ type: String, maxlength: 500, default: null })
  comment: string | null

  @Prop({ type: Boolean, required: true, default: false })
  isReported: boolean

  @Prop({ type: String, maxlength: 500, default: null })
  reportReason: string | null

  @Prop({ type: Boolean, required: true, default: false })
  isHidden: boolean

  createdAt: Date
  updatedAt?: Date
}

export const ReviewSchema = SchemaFactory.createForClass(Review)

ReviewSchema.index({ customerId: 1, menuItemId: 1 }, { unique: true })

// Reviews are soft-moderated. isHidden removes a review from public lists/counters;
// this schema intentionally provides no hard-delete behavior.
