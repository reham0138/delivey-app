import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ErrorCode } from '../errors/error-codes.enum'
import { AppException, type ValidationDetail } from '../errors/app.exception'

interface ErrorResponseBody {
  statusCode: number
  error: string
  code: string
  message: string
  details?: ValidationDetail[]
}

// Fallback code for plain Nest exceptions that carry no AppException code.
// Modules should prefer AppException so the client gets the contract code.
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.ValidationError,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthorized,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.CONFLICT]: ErrorCode.InvalidStatusTransition,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TooManyRequests,
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse()
    const body = this.toErrorBody(exception)

    if (body.statusCode >= 500) {
      this.logger.error(
        `${body.statusCode} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    response.status(body.statusCode).json(body)
  }

  private toErrorBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        error: HttpStatus[exception.getStatus()] ?? 'Error',
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? Array.isArray((res as { message: unknown }).message)
            ? ((res as { message: string[] }).message.join('; '))
            : String((res as { message: unknown }).message)
          : exception.message

      // ValidationPipe errors arrive as BadRequestException with an array of messages.
      const details =
        status === HttpStatus.BAD_REQUEST &&
        typeof res === 'object' &&
        res !== null &&
        Array.isArray((res as { message: unknown }).message)
          ? this.extractValidationDetails(res as { message: string[] })
          : undefined

      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        code: STATUS_TO_CODE[status] ?? ErrorCode.ValidationError,
        message,
        ...(details ? { details } : {}),
      }
    }

    this.logger.error('Unhandled exception', exception)
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: ErrorCode.ValidationError,
      message: 'Internal server error',
    }
  }

  // class-validator messages look like "email must be an email" — split the
  // leading property name off so details match the contract { field, message }.
  private extractValidationDetails(res: { message: string[] }): ValidationDetail[] {
    return res.message.map((raw) => {
      const separator = raw.indexOf(' ')
      if (separator <= 0) return { field: 'unknown', message: raw }
      return { field: raw.slice(0, separator), message: raw.slice(separator + 1) }
    })
  }
}
