import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model, Types } from 'mongoose'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { paginate } from '../../common/utils/pagination.util'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { Restaurant } from '../restaurants/schemas/restaurant.schema'
import { AdminReviewQueryDto } from './dto/admin-review-query.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'
import { assertReviewEligible } from './review-rules'
import { Review, ReviewDocument } from './schemas/review.schema'

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
  ) {}

  async create(user: AuthUser, dto: CreateReviewDto) {
    if (
      !Types.ObjectId.isValid(user.id) ||
      !Types.ObjectId.isValid(dto.orderId) ||
      !Types.ObjectId.isValid(dto.menuItemId)
    ) {
      throw this.reviewNotEligible()
    }

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(dto.orderId),
        customerId: new Types.ObjectId(user.id),
      })
      .exec()
    if (!order) throw this.reviewNotEligible()

    const menuItem = await this.menuItemModel
      .findOne({
        _id: new Types.ObjectId(dto.menuItemId),
        isActive: true,
      })
      .exec()
    if (!menuItem) throw this.reviewNotEligible()

    assertReviewEligible(
      {
        customerId: String(order.customerId),
        status: order.status,
        items: order.items.map((item) => ({ menuItemId: String(item.menuItemId) })),
      },
      user.id,
      dto.menuItemId,
    )

    if (String(menuItem.restaurantId) !== String(order.restaurantId)) {
      throw this.reviewNotEligible()
    }

    const existing = await this.reviewModel.findOne({
      customerId: new Types.ObjectId(user.id),
      menuItemId: new Types.ObjectId(dto.menuItemId),
    })
    if (existing) throw this.reviewAlreadyExists()

    let review: ReviewDocument
    try {
      review = await this.reviewModel.create({
        menuItemId: menuItem._id,
        restaurantId: menuItem.restaurantId,
        customerId: new Types.ObjectId(user.id),
        orderId: order._id,
        customerName: user.name,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        isReported: false,
        reportReason: null,
        isHidden: false,
      })
    } catch (error) {
      if (this.isDuplicateKeyError(error)) throw this.reviewAlreadyExists()
      throw error
    }

    await this.menuItemModel.updateOne(
      { _id: menuItem._id, isActive: true },
      { $inc: { ratingSum: dto.rating, ratingCount: 1 } },
    )
    await this.restaurantModel.updateOne(
      { _id: menuItem.restaurantId },
      { $inc: { ratingSum: dto.rating, ratingCount: 1 } },
    )

    return this.mapReview(review)
  }

  async findMine(customerId: string, menuItemId: string) {
    if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(menuItemId)) {
      throw this.notFound()
    }
    const review = await this.reviewModel.findOne({
      customerId: new Types.ObjectId(customerId),
      menuItemId: new Types.ObjectId(menuItemId),
    })
    if (!review) throw this.notFound()
    return this.mapReview(review)
  }

  async findPublicForMenuItem(menuItemId: string, query: ReviewQueryDto) {
    if (!Types.ObjectId.isValid(menuItemId)) throw this.notFound()
    return this.findPublicPage(
      {
        menuItemId: new Types.ObjectId(menuItemId),
        isHidden: false,
        isReported: false,
      },
      query,
    )
  }

  async findPublicForRestaurant(restaurantId: string, query: ReviewQueryDto) {
    if (!Types.ObjectId.isValid(restaurantId)) throw this.notFound()
    return this.findPublicPage(
      {
        restaurantId: new Types.ObjectId(restaurantId),
        isHidden: false,
        isReported: false,
      },
      query,
    )
  }

  async findForRestaurant(user: AuthUser, query: ReviewQueryDto) {
    const restaurant = await this.findOwnedRestaurant(user)
    const filter: FilterQuery<ReviewDocument> = { restaurantId: restaurant._id }
    if (query.reported !== undefined) filter.isReported = query.reported
    return this.findReviewPage(filter, query)
  }

  async reportForRestaurant(user: AuthUser, reviewId: string, reason: string) {
    const restaurant = await this.findOwnedRestaurant(user)
    if (!Types.ObjectId.isValid(reviewId)) throw this.notFound()
    const review = await this.reviewModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(reviewId),
        restaurantId: restaurant._id,
        isHidden: false,
      },
      {
        $set: {
          isReported: true,
          reportReason: reason.trim(),
        },
      },
      { new: true },
    )
    if (!review) throw this.notFound()
    return this.mapReview(review)
  }

  async findForAdmin(query: AdminReviewQueryDto) {
    const filter: FilterQuery<ReviewDocument> = {}
    if (query.reported !== undefined) filter.isReported = query.reported
    if (query.isHidden !== undefined) filter.isHidden = query.isHidden
    return this.findReviewPage(filter, query, true)
  }

  async hideForAdmin(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) throw this.notFound()

    const review = await this.reviewModel.findOneAndUpdate(
      { _id: new Types.ObjectId(reviewId), isHidden: false },
      { $set: { isHidden: true } },
      { new: true },
    )
    if (!review) {
      const existing = await this.reviewModel.findById(reviewId)
      if (existing?.isHidden) return this.mapReview(existing, true)
      throw this.notFound()
    }

    await this.menuItemModel.updateOne(
      { _id: review.menuItemId },
      { $inc: { ratingSum: -review.rating, ratingCount: -1 } },
    )
    await this.restaurantModel.updateOne(
      { _id: review.restaurantId },
      { $inc: { ratingSum: -review.rating, ratingCount: -1 } },
    )
    return this.mapReview(review, true)
  }

  async dismissReport(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) throw this.notFound()
    const review = await this.reviewModel.findOneAndUpdate(
      { _id: new Types.ObjectId(reviewId) },
      { $set: { isReported: false, reportReason: null } },
      { new: true },
    )
    if (!review) throw this.notFound()
    return this.mapReview(review)
  }

  private async findPublicPage(filter: FilterQuery<ReviewDocument>, query: ReviewQueryDto) {
    return this.findReviewPage(filter, query)
  }

  private async findReviewPage(
    filter: FilterQuery<ReviewDocument>,
    query: ReviewQueryDto,
    includeHidden = false,
  ) {
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ])
    return paginate(
      reviews.map((review) => this.mapReview(review, includeHidden)),
      total,
      query,
    )
  }

  private async findOwnedRestaurant(user: AuthUser): Promise<Restaurant & { _id: Types.ObjectId }> {
    if (!Types.ObjectId.isValid(user.id)) throw this.notFound()
    const restaurant = await this.restaurantModel
      .findOne({ ownerId: new Types.ObjectId(user.id) })
      .exec()
    if (!restaurant) throw this.notFound()
    return restaurant as Restaurant & { _id: Types.ObjectId }
  }

  private mapReview(review: ReviewDocument, includeHidden = false) {
    return {
      id: String(review._id),
      menuItemId: String(review.menuItemId),
      restaurantId: String(review.restaurantId),
      customerId: String(review.customerId),
      orderId: String(review.orderId),
      customerName: review.customerName,
      rating: review.rating,
      comment: review.comment ?? null,
      createdAt:
        review.createdAt instanceof Date
          ? review.createdAt.toISOString()
          : String(review.createdAt),
      updatedAt: null,
      isReported: review.isReported,
      reportReason: review.reportReason ?? null,
      ...(includeHidden ? { isHidden: review.isHidden } : {}),
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    )
  }

  private reviewNotEligible(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ReviewNotEligible,
      'This order is not eligible for a review',
    )
  }

  private reviewAlreadyExists(): AppException {
    return new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.ReviewAlreadyExists,
      'The customer has already reviewed this meal',
    )
  }

  private notFound(): AppException {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Review not found')
  }
}
