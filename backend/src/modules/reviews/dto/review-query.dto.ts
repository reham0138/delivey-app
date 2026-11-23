import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

export class ReviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return value
  })
  @IsBoolean()
  reported?: boolean

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10
}
