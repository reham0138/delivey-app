import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { Types } from 'mongoose'
import { OrderStatus, Role } from '../../common/enums'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrdersService } from './orders.service'
import { describe, expect, it, jest } from '@jest/globals'

describe('OrdersService', () => {
  const restaurantId = new Types.ObjectId()
  const menuItemId = new Types.ObjectId()
  const customerId = new Types.ObjectId()

  interface MenuItemFixture {
    _id: Types.ObjectId
    restaurantId: Types.ObjectId
    name: string
    price: number
    isActive: boolean
    isAvailable: boolean
  }

  interface RestaurantFixture {
    _id: Types.ObjectId
    isActive: boolean
    isOpen: boolean
    deliveryFee: number
    minOrder: number
    deliveryTimeMinutes: number
  }

  function createService(
    orderCreate?: jest.Mock,
    menuItems?: MenuItemFixture[],
    restaurant?: RestaurantFixture,
  ) {
    const resolvedMenuItems: MenuItemFixture[] = menuItems ?? [
      {
        _id: menuItemId,
        restaurantId,
        name: 'Burger',
        price: 12.345,
        isActive: true,
        isAvailable: true,
      },
    ]
    const menuItemExec = jest
      .fn<() => Promise<MenuItemFixture[]>>()
      .mockResolvedValue(resolvedMenuItems)

    const resolvedRestaurant: RestaurantFixture = restaurant ?? {
      _id: restaurantId,
      isActive: true,
      isOpen: true,
      deliveryFee: 4.99,
      minOrder: 10,
      deliveryTimeMinutes: 30,
    }
    const restaurantExec = jest
      .fn<() => Promise<RestaurantFixture>>()
      .mockResolvedValue(resolvedRestaurant)

    const orderModel = {
      create:
        orderCreate ??
        jest.fn().mockImplementation(async (data: unknown) => {
          const orderData =
            data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
          return {
            _id: new Types.ObjectId(),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            ...orderData,
            save: jest.fn(),
          }
        }),
    }
    const menuItemModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: menuItemExec,
        }),
      }),
    }
    const restaurantModel = {
      findById: jest.fn().mockReturnValue({
        exec: restaurantExec,
      }),
    }
    return new OrdersService(orderModel as never, menuItemModel as never, restaurantModel as never)
  }

  function validPayload(): CreateOrderDto {
    const payload: CreateOrderDto = plainToInstance<CreateOrderDto, Record<string, unknown>>(
      CreateOrderDto,
      {
        restaurantId: String(restaurantId),
        items: [{ menuItemId: String(menuItemId), quantity: 2 }],
        deliveryAddress: '1 Main St',
        phone: '123456',
        paymentMethod: 'cash',
        notes: null,
        promoCode: 'WELCOME10',
        tip: 3.335,
        scheduledFor: null,
      },
    )
    return payload
  }

  it('creates an order from database prices and snapshots item data', async () => {
    const service = createService()
    const dto = validPayload()

    const order = await service.create(
      {
        id: String(customerId),
        role: Role.Customer,
        name: 'Mahdi',
        email: 'mahdi@example.com',
      },
      dto,
    )

    expect(order.customerName).toBe('Mahdi')
    expect(order.items).toEqual([
      {
        menuItemId: String(menuItemId),
        name: 'Burger',
        quantity: 2,
        unitPrice: 12.35,
      },
    ])
    expect(order.subtotal).toBe(24.7)
    expect(order.discount).toBe(2.47)
    expect(order.serviceFee).toBe(1.24)
    expect(order.tax).toBe(2.47)
    expect(order.deliveryFee).toBe(4.99)
    expect(order.tip).toBe(3.34)
    expect(order.total).toBe(34.27)
    expect(order.status).toBe('pending')
    expect(order.paymentStatus).toBe('pending')
    expect(order.statusHistory).toHaveLength(1)
    expect(order.statusHistory[0].status).toBe('pending')
  })

  it('rejects forbidden server-controlled create fields', async () => {
    const service = createService()
    const dto = {
      ...validPayload(),
      customerId: String(customerId),
      total: 1,
      status: 'delivered',
    } as CreateOrderDto & Record<string, unknown>

    await expect(
      service.create(
        {
          id: String(customerId),
          role: Role.Customer,
          name: 'Mahdi',
          email: 'mahdi@example.com',
        },
        dto,
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.ValidationError,
    })
  })

  it('rejects duplicate, unavailable, and below-minimum orders', async () => {
    const duplicate = validPayload()
    duplicate.items.push({ menuItemId: String(menuItemId), quantity: 1 })
    await expect(
      createService().create(
        {
          id: String(customerId),
          role: Role.Customer,
          name: 'Mahdi',
          email: 'mahdi@example.com',
        },
        duplicate,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.ValidationError })

    await expect(
      createService(undefined, []).create(
        {
          id: String(customerId),
          role: Role.Customer,
          name: 'Mahdi',
          email: 'mahdi@example.com',
        },
        validPayload(),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.ItemUnavailable })

    await expect(
      createService(undefined, undefined, {
        _id: restaurantId,
        isActive: true,
        isOpen: true,
        deliveryFee: 4.99,
        minOrder: 100,
        deliveryTimeMinutes: 30,
      }).create(
        {
          id: String(customerId),
          role: Role.Customer,
          name: 'Mahdi',
          email: 'mahdi@example.com',
        },
        validPayload(),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.MinOrderNotMet })
  })

  it('validates create DTO whitelist fields', () => {
    const dto = plainToInstance(CreateOrderDto, {
      restaurantId: String(restaurantId),
      items: [{ menuItemId: String(menuItemId), quantity: 2, unitPrice: 1 }],
      deliveryAddress: '1 Main St',
      phone: '123456',
      paymentMethod: 'cash',
      tip: 0,
    })
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('lists restaurant orders only for the owner restaurant', async () => {
    const ownerId = new Types.ObjectId()
    const orderDocument = makeOrderDocument(restaurantId, customerId)
    const orderQuery = {
      status: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 10,
    }
    const orderModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn<() => Promise<(typeof orderDocument)[]>>().mockResolvedValue([orderDocument]),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      }),
    }
    const restaurantModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest
          .fn<() => Promise<{ _id: Types.ObjectId; isActive: boolean; isOpen: boolean }>>()
          .mockResolvedValue({
            _id: restaurantId,
            isActive: true,
            isOpen: true,
          }),
      }),
    }
    const service = new OrdersService(orderModel as never, {} as never, restaurantModel as never)

    const result = await service.findForRestaurant(String(ownerId), orderQuery)

    expect(orderModel.find).toHaveBeenCalledWith({ restaurantId })
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('returns 404 when a restaurant accesses another restaurant order', async () => {
    const ownerId = new Types.ObjectId()
    const orderDocument = makeOrderDocument(new Types.ObjectId(), customerId)
    const orderModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof orderDocument>>().mockResolvedValue(orderDocument),
      }),
    }
    const restaurantModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<{ _id: Types.ObjectId }>>().mockResolvedValue({
          _id: restaurantId,
        }),
      }),
    }
    const service = new OrdersService(orderModel as never, {} as never, restaurantModel as never)

    await expect(
      service.findOneForRestaurant(String(ownerId), String(orderDocument._id)),
    ).rejects.toMatchObject({ code: ErrorCode.NotFound })
  })

  it('marks delivered cash orders paid and appends status history', async () => {
    const ownerId = new Types.ObjectId()
    const orderDocument = makeOrderDocument(restaurantId, customerId)
    orderDocument.status = 'on_the_way'
    orderDocument.paymentMethod = 'cash'
    orderDocument.paymentStatus = 'pending'
    const orderModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof orderDocument>>().mockResolvedValue(orderDocument),
      }),
    }
    const restaurantModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<{ _id: Types.ObjectId }>>().mockResolvedValue({
          _id: restaurantId,
        }),
      }),
    }
    const service = new OrdersService(orderModel as never, {} as never, restaurantModel as never)

    const result = await service.updateStatusForRestaurant(
      String(ownerId),
      String(orderDocument._id),
      OrderStatus.Delivered,
    )

    expect(orderDocument.paymentStatus).toBe('paid')
    expect(orderDocument.status).toBe('delivered')
    expect(orderDocument.statusHistory.map((entry) => entry.status)).toEqual([
      'pending',
      'delivered',
    ])
    expect(orderDocument.save).toHaveBeenCalled()
    expect(result.paymentStatus).toBe('paid')
  })

  it('cancels a customer order and preserves status history', async () => {
    const orderDocument = makeOrderDocument(restaurantId, customerId)
    const orderModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof orderDocument>>().mockResolvedValue(orderDocument),
      }),
    }
    const service = new OrdersService(orderModel as never, {} as never, {} as never)

    const result = await service.cancelForCustomer(
      String(customerId),
      String(orderDocument._id),
      'Changed my mind',
    )

    expect(orderDocument.status).toBe('cancelled')
    expect(orderDocument.cancelledBy).toBe('customer')
    expect(orderDocument.cancellationReason).toBe('Changed my mind')
    expect(orderDocument.statusHistory.map((entry) => entry.status)).toEqual([
      'pending',
      'cancelled',
    ])
    expect(orderDocument.save).toHaveBeenCalled()
    expect(result.status).toBe('cancelled')
  })

  it('requires a reason for admin cancellation', async () => {
    const orderDocument = makeOrderDocument(restaurantId, customerId)
    const orderModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof orderDocument>>().mockResolvedValue(orderDocument),
      }),
    }
    const service = new OrdersService(orderModel as never, {} as never, {} as never)

    await expect(service.cancelForAdmin(String(orderDocument._id), '   ')).rejects.toMatchObject({
      code: ErrorCode.ValidationError,
    })
  })

  function makeOrderDocument(orderRestaurantId: Types.ObjectId, orderCustomerId: Types.ObjectId) {
    const now = new Date('2026-01-01T00:00:00.000Z')
    return {
      _id: new Types.ObjectId(),
      customerId: orderCustomerId,
      customerName: 'Mahdi',
      phone: '123456',
      restaurantId: orderRestaurantId,
      status: 'pending',
      items: [
        {
          menuItemId,
          name: 'Burger',
          quantity: 2,
          unitPrice: 12.35,
        },
      ],
      subtotal: 24.7,
      deliveryFee: 4.99,
      serviceFee: 1.24,
      tax: 2.47,
      discount: 0,
      tip: 0,
      total: 33.4,
      deliveryAddress: '1 Main St',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      notes: null,
      promoCode: null,
      scheduledFor: null,
      estimatedDeliveryAt: new Date('2026-01-01T00:30:00.000Z'),
      statusHistory: [{ status: 'pending', at: now }],
      cancelledBy: null,
      cancellationReason: null,
      createdAt: now,
      save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }
  }
})
