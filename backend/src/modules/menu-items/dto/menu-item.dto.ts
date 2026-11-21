import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { PartialType } from '@nestjs/swagger'

export class MenuItemNutritionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  calories!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  protein!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbs!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fat!: number
}

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsString()
  @MaxLength(500)
  description!: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number

  @IsString()
  @MaxLength(60)
  category!: string

  @IsOptional()
  @Matches(/^$|^https?:\/\/\S+$/i)
  @MaxLength(2048)
  image?: string | null

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  ingredients!: string[]

  @Type(() => Number)
  @IsInt()
  @Min(0)
  preparationTimeMinutes!: number

  @IsOptional()
  @ValidateNested()
  @Type(() => MenuItemNutritionDto)
  nutrition?: MenuItemNutritionDto | null

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

export class UpdateMenuItemAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean
}
