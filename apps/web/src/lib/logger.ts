/**
 * Centralized logging utility for the application
 * Provides structured logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private serviceName = 'siteproof-api';
  private environment = process.env.NODE_ENV || 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...context,
    };

    return JSON.stringify(baseLog);
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };

    console.error(this.formatMessage('error', message, errorContext));
  }
}

export const log = new Logger();
