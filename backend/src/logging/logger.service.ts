import { Injectable, LoggerService } from '@nestjs/common';
import { env } from '../utils/environment';

interface LogContext {
  method?: string;
  url?: string;
  userId?: string;
  entryDate?: string;
  error?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class AppLogger implements LoggerService {
  private formatLog(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'rose-bud-thorn-api',
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  log(message: string, context?: LogContext): void {
    if (!env.shouldSuppressLogging) {
      console.log(this.formatLog('info', message, context));
    }
  }

  error(message: string, error?: string, context?: LogContext): void {
    if (!env.shouldSuppressLogging) {
      console.error(this.formatLog('error', message, { ...context, error }));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!env.shouldSuppressLogging) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (env.shouldEnableVerboseLogging) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  verbose(message: string, context?: LogContext): void {
    if (env.shouldEnableVerboseLogging) {
      console.log(this.formatLog('verbose', message, context));
    }
  }

  // Helper methods for common log patterns
  logRequest(method: string, url: string, userId?: string): void {
    this.log('Request received', { method, url, userId });
  }

  logResponse(method: string, url: string, statusCode: number, duration: number): void {
    this.log('Request completed', { method, url, statusCode, duration });
  }

  logEntryOperation(operation: string, entryDate: string, userId?: string): void {
    this.log(`Entry ${operation}`, { operation, entryDate, userId });
  }

  logCacheOperation(operation: string, key: string, hit?: boolean): void {
    this.debug(`Cache ${operation}`, { operation, key, hit });
  }
}
