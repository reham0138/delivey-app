import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { AccountStatus } from '../../../common/enums'

export class UpdateUserStatusDto {
  @ApiProperty({ enum: AccountStatus })
  @IsEnum(AccountStatus)
  status!: AccountStatus
}
