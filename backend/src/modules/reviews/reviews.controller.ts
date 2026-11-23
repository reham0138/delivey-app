import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { AdminReviewQueryDto } from './dto/admin-review-query.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReportReviewDto } from './dto/report-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'
import { ReviewsService } from './reviews.service'

@ApiTags('reviews')
@ApiBearerAuth('bearer')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @Roles(Role.Customer)
  @ApiOperation({ summary: 'Create a review for a meal on a delivered order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user, dto)
  }

  @Get('menu-items/:id/reviews/mine')
  @Roles(Role.Customer)
  @ApiOperation({ summary: 'Get the current customer review for a meal' })
  findMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reviewsService.findMine(user.id, id)
  }

  @Public()
  @Get('menu-items/:id/reviews')
  @ApiOperation({ summary: 'List public reviews for a meal' })
  findPublicForMenuItem(@Param('id') id: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicForMenuItem(id, query)
  }

  @Public()
  @Get('restaurants/:id/reviews')
  @ApiOperation({ summary: 'List public reviews for a restaurant' })
  findPublicForRestaurant(@Param('id') id: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicForRestaurant(id, query)
  }

  @Get('restaurant/reviews')
  @Roles(Role.Restaurant)
  @ApiOperation({ summary: 'List reviews on the owner restaurant' })
  findForRestaurant(@CurrentUser() user: AuthUser, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findForRestaurant(user, query)
  }

  @Post('restaurant/reviews/:id/report')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Restaurant)
  @ApiOperation({ summary: 'Report a review on the owner restaurant' })
  reportForRestaurant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.reportForRestaurant(user, id, dto.reason)
  }

  @Get('admin/reviews')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List all reviews, including hidden and reported' })
  findForAdmin(@Query() query: AdminReviewQueryDto) {
    return this.reviewsService.findForAdmin(query)
  }

  @Post('admin/reviews/:id/hide')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Hide a review and remove it from rating counters' })
  hide(@Param('id') id: string) {
    return this.reviewsService.hideForAdmin(id)
  }

  @Post('admin/reviews/:id/dismiss-report')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Dismiss a review report' })
  dismissReport(@Param('id') id: string) {
    return this.reviewsService.dismissReport(id)
  }
}
