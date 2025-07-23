import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    this.logger.logRequest(method, url);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.logResponse(method, url, response.statusCode, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            'Request failed',
            error.message,
            { method, url, duration, statusCode: error.status || 500 }
          );
        },
      }),
    );
  }
}