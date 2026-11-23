import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { CancellationActor, OrderStatus, PaymentMethod, PaymentStatus } from '../../../common/enums'

export type OrderDocument = HydratedDocument<Order>

@Schema({ _id: false })
export class OrderItemSnapshot {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  menuItemId: Types.ObjectId

  @Prop({ type: String, required: true })
  name: string

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number

  @Prop({ type: Number, required: true, min: 1, max: 99 })
  quantity: number
}

export const OrderItemSnapshotSchema = SchemaFactory.createForClass(OrderItemSnapshot)

@Schema({ _id: false })
export class OrderStatusHistoryEntry {
  @Prop({
    type: String,
    required: true,
    enum: OrderStatus,
  })
  status: OrderStatus

  @Prop({ type: Date, required: true })
  at: Date
}

export const OrderStatusHistoryEntrySchema = SchemaFactory.createForClass(OrderStatusHistoryEntry)

@Schema()
export class Order {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  customerId: Types.ObjectId

  @Prop({ type: String, required: true })
  customerName: string

  @Prop({ type: String, required: true })
  phone: string

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  restaurantId: Types.ObjectId

  @Prop({
    type: String,
    required: true,
    enum: OrderStatus,
    default: OrderStatus.Pending,
  })
  status: OrderStatus

  @Prop({ type: [OrderItemSnapshotSchema], required: true })
  items: OrderItemSnapshot[]

  @Prop({ type: Number, required: true, min: 0 })
  subtotal: number

  @Prop({ type: Number, required: true, min: 0 })
  deliveryFee: number

  @Prop({ type: Number, required: true, min: 0 })
  serviceFee: number

  @Prop({ type: Number, required: true, min: 0 })
  tax: number

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount: number

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tip: number

  @Prop({ type: Number, required: true, min: 0 })
  total: number

  @Prop({ type: String, required: true })
  deliveryAddress: string

  @Prop({
    type: String,
    required: true,
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod

  @Prop({
    type: String,
    required: true,
    enum: PaymentStatus,
  })
  paymentStatus: PaymentStatus

  @Prop({ type: String, default: null })
  notes: string | null

  @Prop({ type: String, default: null })
  promoCode: string | null

  @Prop({ type: Date, default: null })
  scheduledFor: Date | null

  @Prop({ type: Date, required: true })
  estimatedDeliveryAt: Date

  @Prop({ type: [OrderStatusHistoryEntrySchema], required: true })
  statusHistory: OrderStatusHistoryEntry[]

  @Prop({
    type: String,
    enum: CancellationActor,
    default: null,
  })
  cancelledBy: CancellationActor | null

  @Prop({ type: String, default: null })
  cancellationReason: string | null

  createdAt: Date
}

export const OrderSchema = SchemaFactory.createForClass(Order)

OrderSchema.index({ customerId: 1, createdAt: -1 })
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 })

// Orders are retained for totals, history, ratings, and auditability.
// This schema intentionally provides no hard-delete behavior.
