import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

export class ReviewQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return value
  })
  @IsBoolean()
  reported?: boolean

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return value
  })
  @IsBoolean()
  isHidden?: boolean

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
