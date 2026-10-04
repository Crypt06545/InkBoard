// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface.js';

const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.refreshToken || null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken = req.cookies?.refreshToken;
    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      refreshToken,
    };
  }
}
