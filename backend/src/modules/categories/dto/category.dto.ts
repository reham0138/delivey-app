import { Transform } from 'class-transformer'
import { IsBoolean, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator'

export class CreateCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean
}

export class UpdateCategoryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean
}
