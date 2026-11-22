import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateReviewDto {
  @IsMongoId()
  orderId: string

  @IsMongoId()
  menuItemId: string

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null
}
