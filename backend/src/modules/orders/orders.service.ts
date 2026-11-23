import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model, Types } from 'mongoose'
import {
  CancellationActor,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from '../../common/enums'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { paginate } from '../../common/utils/pagination.util'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { Restaurant } from '../restaurants/schemas/restaurant.schema'
import { CreateOrderDto } from './dto/create-order.dto'
import { AdminOrderQueryDto, OrderQueryDto } from './dto/order-query.dto'
import { Order, OrderDocument } from './schemas/order.schema'
import { applyStatusTransition, calculateOrderTotals, cancelOrder } from './order-rules'
import { escapeRegex } from './utils/escape-regex'

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
  ) {}

  async quote(dto: CreateOrderDto) {
    this.assertNoForbiddenFields(dto)
    const prepared = await this.prepareOrder(dto)
    return prepared.totals
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    if (user.role !== Role.Customer) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.Forbidden, 'Customer role required')
    }
    this.assertNoForbiddenFields(dto)
    const prepared = await this.prepareOrder(dto)
    const now = new Date()
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null

    const order = await this.orderModel.create({
      customerId: new Types.ObjectId(user.id),
      customerName: user.name,
      phone: dto.phone.trim(),
      restaurantId: prepared.restaurant._id,
      status: OrderStatus.Pending,
      items: prepared.items,
      ...prepared.totals,
      deliveryAddress: dto.deliveryAddress.trim(),
      paymentMethod: dto.paymentMethod,
      paymentStatus:
        dto.paymentMethod === PaymentMethod.Cash ? PaymentStatus.Pending : PaymentStatus.Simulated,
      notes: dto.notes?.trim() || null,
      promoCode: dto.promoCode?.trim().toUpperCase() || null,
      scheduledFor,
      estimatedDeliveryAt: new Date(
        (scheduledFor ?? now).getTime() + prepared.restaurant.deliveryTimeMinutes * 60 * 1000,
      ),
      statusHistory: [{ status: OrderStatus.Pending, at: now }],
      cancelledBy: null,
      cancellationReason: null,
    })

    return this.mapOrder(order)
  }

  async findOwn(customerId: string, query: OrderQueryDto) {
    if (!Types.ObjectId.isValid(customerId)) throw this.notFound()
    const filter = this.buildOrderListFilter(query)
    filter.customerId = new Types.ObjectId(customerId)

    return this.findOrderPage(filter, query)
  }

  async findForRestaurant(ownerId: string, query: OrderQueryDto) {
    const restaurant = await this.findOwnedRestaurant(ownerId)
    const filter = this.buildOrderListFilter(query)
    filter.restaurantId = restaurant._id
    return this.findOrderPage(filter, query)
  }

  async findOneForRestaurant(ownerId: string, orderId: string) {
    const restaurant = await this.findOwnedRestaurant(ownerId)
    const order = await this.findOrderById(orderId)
    if (String(order.restaurantId) !== String(restaurant._id)) throw this.notFound()
    return this.mapOrder(order)
  }

  async findForAdmin(query: AdminOrderQueryDto) {
    const filter = this.buildOrderListFilter(query)
    if (query.restaurantId) {
      if (!Types.ObjectId.isValid(query.restaurantId)) throw this.notFound()
      filter.restaurantId = new Types.ObjectId(query.restaurantId)
    }
    return this.findOrderPage(filter, query)
  }

  async findOneForAdmin(orderId: string) {
    return this.mapOrder(await this.findOrderById(orderId))
  }

  async findOneForCustomer(customerId: string, orderId: string) {
    const order = await this.findOwnOrder(customerId, orderId)
    return this.mapOrder(order)
  }

  async cancelForCustomer(customerId: string, orderId: string, reason?: string) {
    const order = await this.findOwnOrder(customerId, orderId)
    return this.applyCancellation(order, CancellationActor.Customer, reason)
  }

  async updateStatusForRestaurant(ownerId: string, orderId: string, status: Order['status']) {
    const restaurant = await this.findOwnedRestaurant(ownerId)
    const order = await this.findOrderById(orderId)
    if (String(order.restaurantId) !== String(restaurant._id)) throw this.notFound()

    const at = new Date()
    const history = (order.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
    }))
    const result = applyStatusTransition(
      order.status,
      status,
      history,
      at.toISOString(),
      order.paymentMethod,
      order.paymentStatus,
    )
    order.status = result.status
    order.statusHistory = result.statusHistory.map((entry) => ({
      status: entry.status,
      at: new Date(entry.at),
    }))
    if (result.paymentStatus) order.paymentStatus = result.paymentStatus
    await order.save()
    return this.mapOrder(order)
  }

  async cancelForRestaurant(ownerId: string, orderId: string, reason?: string) {
    const restaurant = await this.findOwnedRestaurant(ownerId)
    const order = await this.findOrderById(orderId)
    if (String(order.restaurantId) !== String(restaurant._id)) throw this.notFound()
    return this.applyCancellation(order, CancellationActor.Restaurant, reason)
  }

  async cancelForAdmin(orderId: string, reason?: string) {
    const order = await this.findOrderById(orderId)
    return this.applyCancellation(order, CancellationActor.Admin, reason)
  }

  private async prepareOrder(dto: CreateOrderDto) {
    if (!Types.ObjectId.isValid(dto.restaurantId)) throw this.restaurantUnavailable()
    const restaurant = await this.restaurantModel.findById(dto.restaurantId).exec()
    if (!restaurant || !restaurant.isActive || !restaurant.isOpen) {
      throw this.restaurantUnavailable()
    }

    const uniqueIds = [...new Set(dto.items.map((item) => item.menuItemId))]
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id))
    if (uniqueIds.length !== dto.items.length) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationError,
        'Duplicate menu items are not allowed',
        [{ field: 'items', message: 'must not contain duplicate menuItemId values' }],
      )
    }

    const menuItems = await this.menuItemModel
      .find({
        _id: { $in: objectIds },
        restaurantId: restaurant._id,
        isActive: true,
        isAvailable: true,
      })
      .select('+isActive')
      .exec()
    if (menuItems.length !== uniqueIds.length) throw this.itemUnavailable()

    const byId = new Map(menuItems.map((item) => [String(item._id), item]))
    const items = dto.items.map((line) => {
      const menuItem = byId.get(line.menuItemId)
      if (!menuItem) throw this.itemUnavailable()
      return {
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: line.quantity,
        unitPrice: roundDatabaseMoney(menuItem.price),
      }
    })

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    if (subtotal < restaurant.minOrder) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.MinOrderNotMet,
        'Subtotal is below the restaurant minimum order',
      )
    }

    if (dto.scheduledFor) {
      const scheduledFor = new Date(dto.scheduledFor)
      if (scheduledFor.getTime() <= Date.now()) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.ValidationError,
          'scheduledFor must be in the future',
          [{ field: 'scheduledFor', message: 'must be in the future' }],
        )
      }
    }

    const totals = calculateOrderTotals({
      subtotal,
      deliveryFee: restaurant.deliveryFee,
      tip: dto.tip,
      promoCode: dto.promoCode,
    })
    return { restaurant, items, totals }
  }

  private buildOrderListFilter(query: OrderQueryDto): FilterQuery<OrderDocument> {
    const filter: FilterQuery<OrderDocument> = {}
    if (query.status) filter.status = query.status

    if (query.search?.trim()) {
      const search = escapeRegex(query.search.trim())
      const orderIdTail = escapeRegex(query.search.trim().replace(/^#/, '').slice(-6))
      filter.$or = [
        { 'items.name': { $regex: search, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: `${orderIdTail}$`,
              options: 'i',
            },
          },
        },
      ]
    }

    if (query.from || query.to) {
      filter.createdAt = {}
      if (query.from) filter.createdAt.$gte = new Date(query.from)
      if (query.to) filter.createdAt.$lte = new Date(query.to)
    }
    return filter
  }

  private async findOrderPage(filter: FilterQuery<OrderDocument>, query: OrderQueryDto) {
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ])
    return paginate(
      orders.map((order) => this.mapOrder(order)),
      total,
      query,
    )
  }

  private async findOwnOrder(customerId: string, orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(orderId)) {
      throw this.notFound()
    }
    const order = await this.orderModel
      .findOne({ _id: new Types.ObjectId(orderId), customerId: new Types.ObjectId(customerId) })
      .exec()
    if (!order) throw this.notFound()
    return order
  }

  private async findOrderById(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) throw this.notFound()
    const order = await this.orderModel.findById(orderId).exec()
    if (!order) throw this.notFound()
    return order
  }

  private async findOwnedRestaurant(
    ownerId: string,
  ): Promise<Restaurant & { _id: Types.ObjectId }> {
    if (!Types.ObjectId.isValid(ownerId)) throw this.notFound()
    const restaurant = await this.restaurantModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .exec()
    if (!restaurant) throw this.notFound()
    return restaurant as Restaurant & { _id: Types.ObjectId }
  }

  private async applyCancellation(order: OrderDocument, actor: CancellationActor, reason?: string) {
    const result = cancelOrder(
      order.status,
      actor,
      (order.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
      })),
      new Date().toISOString(),
      reason,
    )
    order.status = result.status
    order.cancelledBy = result.cancelledBy
    order.cancellationReason = result.cancellationReason
    order.statusHistory = result.statusHistory.map((entry) => ({
      status: entry.status,
      at: new Date(entry.at),
    }))
    await order.save()
    return this.mapOrder(order)
  }

  private assertNoForbiddenFields(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return
    const forbidden = [
      'customerId',
      'customerName',
      'price',
      'prices',
      'unitPrice',
      'subtotal',
      'deliveryFee',
      'serviceFee',
      'tax',
      'discount',
      'fees',
      'total',
      'totals',
      'status',
      'paymentStatus',
      'statusHistory',
      'estimatedDeliveryAt',
    ]
    const record = payload as Record<string, unknown>
    const supplied = forbidden.filter((field) =>
      Object.prototype.hasOwnProperty.call(record, field),
    )
    if (record.items && Array.isArray(record.items)) {
      for (const item of record.items) {
        if (!item || typeof item !== 'object') continue
        for (const field of forbidden) {
          if (Object.prototype.hasOwnProperty.call(item as Record<string, unknown>, field)) {
            supplied.push(field)
          }
        }
      }
    }
    if (supplied.length) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationError,
        'Server-controlled fields are not allowed',
        [...new Set(supplied)].map((field) => ({
          field,
          message: 'must be provided by the server',
        })),
      )
    }
  }

  private mapOrder(order: OrderDocument) {
    return {
      id: String(order._id),
      customerId: String(order.customerId),
      customerName: order.customerName,
      phone: order.phone,
      restaurantId: String(order.restaurantId),
      status: order.status,
      items: order.items.map((item) => ({
        menuItemId: String(item.menuItemId),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee,
      tax: order.tax,
      discount: order.discount,
      tip: order.tip,
      total: order.total,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes ?? null,
      promoCode: order.promoCode ?? null,
      scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
      estimatedDeliveryAt: order.estimatedDeliveryAt.toISOString(),
      statusHistory: order.statusHistory.map((entry) => ({
        status: entry.status,
        at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
      })),
      cancelledBy: order.cancelledBy ?? null,
      cancellationReason: order.cancellationReason ?? null,
      createdAt:
        order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
    }
  }

  private itemUnavailable(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ItemUnavailable,
      'One or more menu items are unavailable',
    )
  }

  private restaurantUnavailable(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.RestaurantUnavailable,
      'Restaurant is unavailable',
    )
  }

  private notFound(): AppException {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Order not found')
  }
}

function roundDatabaseMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
