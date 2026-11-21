import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export enum RestaurantSort {
  Rating = 'rating',
  DeliveryTime = 'deliveryTime',
  DeliveryFee = 'deliveryFee',
  Name = 'name',
}

export class ListRestaurantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  cuisine?: string

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isOpen?: boolean

  @IsOptional()
  @IsEnum(RestaurantSort)
  sort = RestaurantSort.Rating
}
