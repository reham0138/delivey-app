import {
  IsBooleanString,
  IsIn,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListMenuItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @IsOptional()
  @IsMongoId()
  restaurantId?: string

  @IsOptional()
  @IsNumberString()
  minPrice?: string

  @IsOptional()
  @IsNumberString()
  maxPrice?: string

  @IsOptional()
  @IsBooleanString()
  isPopular?: string

  @IsOptional()
  @IsBooleanString()
  openOnly?: string

  @IsOptional()
  @IsBooleanString()
  includeUnavailable?: string

  @IsOptional()
  @IsIn(['rating', 'price_asc', 'price_desc', 'name'])
  sort: 'rating' | 'price_asc' | 'price_desc' | 'name' = 'rating'
}

export class RestaurantMenuItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsBooleanString()
  includeUnavailable?: string
}

export class ListOwnerMenuItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @IsOptional()
  @IsBooleanString()
  isAvailable?: string
}

export class ListAdminMenuItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsMongoId()
  restaurantId?: string

  @IsOptional()
  @IsBooleanString()
  isAvailable?: string
}
