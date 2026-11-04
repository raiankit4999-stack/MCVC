import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../config';
import { PrismaService } from '../common/prisma.service';
import { IS_PUBLIC } from './decorators';
import { ACCESS_COOKIE } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-mcvc-csrf';

interface AccessPayload { sub: string; typ: 'access' }

/**
 * Global authentication guard. Accepts a Bearer token or the httpOnly access
 * cookie. Cookie-authenticated state-changing requests must carry the custom
 * CSRF header, which cross-site forms cannot set.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);

    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
    const token = bearer ?? cookie;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication required');
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret: this.config.jwtAccessSecret, algorithms: ['HS256'] });
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('Session expired');
    }
    if (payload.typ !== 'access') throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, platformRole: true, isActive: true },
    });
    if (!user || !user.isActive) {
      if (isPublic) return true;
      throw new UnauthorizedException();
    }

    const viaCookie = !bearer;
    if (viaCookie && !SAFE_METHODS.has(req.method) && req.headers[CSRF_HEADER] !== '1') {
      throw new ForbiddenException('Missing CSRF header');
    }

    req.user = { id: user.id, email: user.email, name: user.name, platformRole: user.platformRole };
    req.authViaCookie = viaCookie;
    return true;
  }
}
