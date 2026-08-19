import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate unique request ID
    const requestId = uuidv4();
    (req as any).id = requestId;

    const startTime = Date.now();
    const { method, url, body, query, params } = req;

    // Set context for this request
    this.logger.setContext({
      requestId,
      path: url,
      method,
    });

    // Log incoming request
    this.logger.debug(`Incoming ${method} ${url}`, {
      query,
      params,
      bodySize: JSON.stringify(body || {}).length,
    });

    // Intercept response
    const originalSend = res.send;
    const logger = this.logger;
    
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      logger.log(`${method} ${url} - ${statusCode}`, {
        duration: `${duration}ms`,
        statusCode,
      });

      return originalSend.call(this, data);
    };

    next();
  }
}
