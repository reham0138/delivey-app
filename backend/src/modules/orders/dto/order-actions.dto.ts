import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { OrderStatus } from '../../../common/enums'

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}
