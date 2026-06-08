import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';
import { cacheHitStore } from './cache-context';

@Injectable()
export class CacheHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const store = { hit: false };
    const res = context.switchToHttp().getResponse<Response>();

    return new Observable<unknown>((observer) => {
      cacheHitStore.run(store, () => {
        next
          .handle()
          .pipe(
            tap({
              next: () => res.setHeader('X-Cache', store.hit ? 'HIT' : 'MISS'),
            }),
          )
          .subscribe({
            next: (v) => observer.next(v as unknown),
            error: (e: unknown) => observer.error(e),
            complete: () => observer.complete(),
          });
      });
    });
  }
}
