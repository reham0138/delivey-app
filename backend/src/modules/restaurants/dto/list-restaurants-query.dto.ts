import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsBooleanString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListRestaurantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cuisine?: string

  @IsOptional()
  @IsBooleanString()
  isOpen?: string

  @IsOptional()
  @IsIn(['rating', 'deliveryTime', 'deliveryFee', 'name'])
  sort: 'rating' | 'deliveryTime' | 'deliveryFee' | 'name' = 'rating'
}

export class ListAdminRestaurantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsBooleanString()
  isActive?: string
}

export class UpdateRestaurantStatusDto {
  @IsBoolean()
  isActive!: boolean
}

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cuisine?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryTimeMinutes?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFee?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrder?: number

  @IsOptional()
  @IsString()
  @Matches(/^$|^https?:\/\/\S+$/i)
  @MaxLength(2048)
  image?: string

  @IsOptional()
  @IsString()
  @Matches(/^$|^https?:\/\/\S+$/i)
  @MaxLength(2048)
  cover?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  openingHours?: string

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean
}
