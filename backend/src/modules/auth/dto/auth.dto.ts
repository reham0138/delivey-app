import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { Role } from '../../../common/enums'

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string

  @ApiProperty()
  @IsEmail()
  email: string

  // Contract: min 8 on register; login does not check length.
  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  // Public registration can never create an admin.
  @ApiProperty({ enum: [Role.Customer, Role.Restaurant] })
  @IsIn([Role.Customer, Role.Restaurant])
  role: Role
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  password: string
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refresh_token: string
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refresh_token: string
}
