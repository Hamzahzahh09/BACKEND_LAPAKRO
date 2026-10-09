import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { ApiError, ApiErrorResponse } from '../exceptions/api.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let error = 'Internal Server Error';
    let context: Record<string, any> | undefined;

    // Handle custom ApiError
    if (exception instanceof ApiError) {
      status = exception.statusCode;
      message = exception.message;
      error = exception.error;
      context = exception.context;
    }
    // Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || 'HTTP Exception';
      } else {
        message = exceptionResponse.toString();
      }
    }
    // Handle unknown errors
    else {
      message = exception?.message || 'Unknown Error';
      error = exception?.name || 'Unknown Error';
    }

    const errorResponse: ApiErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      context,
    };

    // Log the error
    this.logger.setContext({
      requestId: (request as any).id || 'unknown',
      path: request.url,
      method: request.method,
    });

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url}`, exception, {
        statusCode: status,
        body: request.body,
      });
    } else {
      this.logger.warn(`${request.method} ${request.url}`, {
        statusCode: status,
        message,
      });
    }

    this.logger.clearContext();

    response.status(status).json(errorResponse);
  }
}
