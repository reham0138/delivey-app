import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { ReviewQueryDto } from './review-query.dto'

export class AdminReviewQueryDto extends ReviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return value
  })
  @IsBoolean()
  isHidden?: boolean
}
