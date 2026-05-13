import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtAccessPayload, JwtAuthUser } from './jwt-auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtAccessPayload): JwtAuthUser {
    if (!payload.sub) {
      throw new Error('Invalid token payload: missing sub'); // Will cause 401
    }
    return { userId: payload.sub, email: payload.email };
  }
}
