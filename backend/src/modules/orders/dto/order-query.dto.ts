import { Transform } from 'class-transformer'
import { IsEnum, IsISO8601, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator'
import { OrderStatus } from '../../../common/enums'

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsISO8601()
  from?: string

  @IsOptional()
  @IsISO8601()
  to?: string

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10
}

export class AdminOrderQueryDto extends OrderQueryDto {
  @IsOptional()
  @IsMongoId()
  restaurantId?: string
}
