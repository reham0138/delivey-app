import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
