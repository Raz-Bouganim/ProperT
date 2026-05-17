import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAuthUser } from './jwt-auth.types';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtAuthUser =>
    ctx.switchToHttp().getRequest<Request>().user as JwtAuthUser,
);
