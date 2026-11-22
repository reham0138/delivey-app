import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { PaymentMethod } from '../../../common/enums'

export class CreateOrderItemDto {
  @IsMongoId()
  menuItemId: string

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number
}

export class CreateOrderDto {
  @IsMongoId()
  restaurantId: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  deliveryAddress: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null

  @IsOptional()
  @IsString()
  promoCode?: string | null

  @IsNumber()
  @Min(0)
  tip: number

  @IsOptional()
  @IsISO8601()
  scheduledFor?: string | null
}
