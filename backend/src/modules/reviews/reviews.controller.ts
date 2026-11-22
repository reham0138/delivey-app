import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
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
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user, dto)
  }

  @Get('menu-items/:id/reviews/mine')
  @Roles(Role.Customer)
  findMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reviewsService.findMine(user.id, id)
  }

  @Public()
  @Get('menu-items/:id/reviews')
  findPublicForMenuItem(@Param('id') id: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicForMenuItem(id, query)
  }

  @Public()
  @Get('restaurants/:id/reviews')
  findPublicForRestaurant(@Param('id') id: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicForRestaurant(id, query)
  }

  @Get('restaurant/reviews')
  @Roles(Role.Restaurant)
  findForRestaurant(@CurrentUser() user: AuthUser, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findForRestaurant(user, query)
  }

  @Post('restaurant/reviews/:id/report')
  @Roles(Role.Restaurant)
  reportForRestaurant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.reportForRestaurant(user, id, dto.reason)
  }

  @Get('admin/reviews')
  @Roles(Role.Admin)
  findForAdmin(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findForAdmin(query)
  }

  @Post('admin/reviews/:id/hide')
  @Roles(Role.Admin)
  hide(@Param('id') id: string) {
    return this.reviewsService.hideForAdmin(id)
  }

  @Post('admin/reviews/:id/dismiss-report')
  @Roles(Role.Admin)
  dismissReport(@Param('id') id: string) {
    return this.reviewsService.dismissReport(id)
  }
}
