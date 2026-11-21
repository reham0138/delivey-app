import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export enum MenuItemSort {
  Rating = 'rating',
  PriceAscending = 'price_asc',
  PriceDescending = 'price_desc',
  Name = 'name',
}

export class RestaurantMenuItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  category?: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  includeUnavailable = false
}

export class ListMenuItemsQueryDto extends RestaurantMenuItemsQueryDto {
  @IsOptional()
  @IsMongoId()
  restaurantId?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isPopular?: boolean

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  openOnly?: boolean

  @IsOptional()
  @IsEnum(MenuItemSort)
  sort = MenuItemSort.Rating
}
