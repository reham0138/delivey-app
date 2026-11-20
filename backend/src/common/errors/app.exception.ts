import { HttpException, HttpStatus } from '@nestjs/common'
import { ErrorCode } from './error-codes.enum'

export interface ValidationDetail {
  field: string
  message: string
}

// Convenience wrapper so modules can throw contract-shaped errors:
//   throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.ItemUnavailable, 'Meal is unavailable')
export class AppException extends HttpException {
  readonly code: ErrorCode
  readonly details?: ValidationDetail[]

  constructor(
    status: HttpStatus | number,
    code: ErrorCode,
    message: string,
    details?: ValidationDetail[],
  ) {
    super(message, status)
    this.code = code
    this.details = details
  }
}
