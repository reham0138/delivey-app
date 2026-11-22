import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class ReportReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string
}
