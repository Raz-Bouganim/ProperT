import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }

/**
 * Runs JWT validation only when `Authorization: Bearer` is present.
 * Requests without a token pass through (no `req.user`); invalid tokens still yield 401.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string } }>();
    const auth = req.headers?.authorization;
    if (!auth || !String(auth).startsWith('Bearer ')) {
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
