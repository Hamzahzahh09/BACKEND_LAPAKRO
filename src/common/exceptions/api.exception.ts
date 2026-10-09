import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  context?: Record<string, any>;
}

export class ApiError extends HttpException {
  constructor(
    public readonly message: string,
    public readonly statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly error: string = 'Internal Server Error',
    public readonly context?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        error,
        timestamp: new Date().toISOString(),
        context,
      },
      statusCode,
    );
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, 'Validation Error', context);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HttpStatus.NOT_FOUND, 'Not Found', context);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, HttpStatus.UNAUTHORIZED, 'Unauthorized', context);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, HttpStatus.FORBIDDEN, 'Forbidden', context);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HttpStatus.CONFLICT, 'Conflict', context);
  }
}

export class InternalServerError extends ApiError {
  constructor(
    message: string = 'Internal Server Error',
    context?: Record<string, any>,
  ) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
      context,
    );
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(
    message: string = 'Service Unavailable',
    context?: Record<string, any>,
  ) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      'Service Unavailable',
      context,
    );
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string = 'Too many requests',
    context?: Record<string, any>,
  ) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'Rate Limit Exceeded',
      context,
    );
  }
}
