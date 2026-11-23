import {
  IsBooleanString,
  IsIn,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

type MenuItemSort = 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'name'

export class ListMenuItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @ApiPropertyOptional({ format: 'ObjectId' })
  @IsOptional()
  @IsMongoId()
  restaurantId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  minPrice?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  maxPrice?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  isPopular?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  openOnly?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  includeUnavailable?: string

  @ApiPropertyOptional({ enum: ['popular', 'rating', 'price_asc', 'price_desc', 'name'], default: 'rating' })
  @IsOptional()
  @IsIn(['popular', 'rating', 'price_asc', 'price_desc', 'name'])
  sort: MenuItemSort = 'rating'
}

export class RestaurantMenuItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  includeUnavailable?: string

  @ApiPropertyOptional({ enum: ['popular', 'rating', 'price_asc', 'name'], default: 'rating' })
  @IsOptional()
  @IsIn(['popular', 'rating', 'price_asc', 'name'])
  sort: Exclude<MenuItemSort, 'price_desc'> = 'rating'
}

export class ListOwnerMenuItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  isAvailable?: string
}

export class ListAdminMenuItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ format: 'ObjectId' })
  @IsOptional()
  @IsMongoId()
  restaurantId?: string

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  isAvailable?: string
}
