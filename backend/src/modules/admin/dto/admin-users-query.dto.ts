import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'
import { AccountStatus, Role } from '../../../common/enums'

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on name, email or phone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus
}
