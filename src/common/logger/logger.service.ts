import { Injectable, Logger } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface LogContext {
  userId?: string;
  transactionId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService extends Logger {
  private logContext: LogContext = {};

  setContext(context: Partial<LogContext>) {
    this.logContext = { ...this.logContext, ...context };
  }

  clearContext() {
    this.logContext = {};
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.logContext).length
      ? ` [${JSON.stringify(this.logContext)}]`
      : '';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}]${contextStr} ${message}${metaStr}`;
  }

  debug(message: string, meta?: any) {
    super.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
  }

  log(message: string, meta?: any) {
    super.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  warn(message: string, meta?: any) {
    super.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  error(message: string, error?: any, meta?: any) {
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;
    super.error(
      this.formatMessage(LogLevel.ERROR, message, {
        error: errorInfo,
        ...meta,
      }),
    );
  }

  fatal(message: string, error?: any, meta?: any) {
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;
    super.error(
      this.formatMessage(LogLevel.FATAL, message, {
        error: errorInfo,
        ...meta,
      }),
    );
  }
}
