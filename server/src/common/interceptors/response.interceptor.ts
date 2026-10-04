import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface StandardResponse {
  message?: string;
  data?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response: T) => {
        // Controller যদি already { message, data } return করে
        if (
          typeof response === 'object' &&
          response !== null &&
          ('message' in response || 'data' in response)
        ) {
          const result = response as StandardResponse;

          return {
            success: true,

            ...(result.message !== undefined && {
              message: result.message,
            }),

            ...(result.data !== undefined && {
              data: result.data,
            }),
          };
        }

        // Controller সরাসরি কোনো data return করলে
        return {
          success: true,
          data: response,
        };
      }),
    );
  }
}
