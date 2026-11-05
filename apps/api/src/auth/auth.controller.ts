import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { APP_CONFIG, AppConfig } from '../config';
import { ApiZodBody, ZBody } from '../common/zod';
import { indianPhone } from '../common/validators';
import { AuthService } from './auth.service';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoModeEnabled } from '../seed/demo-accounts';
import { CSRF_HEADER } from './auth.guard';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies';
import { CurrentUser, Public } from './decorators';
import type { AuthUser } from './types';

const password = z.string().min(10, 'Use at least 10 characters').max(128);
const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  phone: indianPhone.optional(),
  password,
});
const LoginSchema = z.object({ login: z.string().trim().min(3).max(200), password: z.string().min(1).max(128) });
const RefreshSchema = z.object({ refreshToken: z.string().optional() });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, @Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiZodBody(RegisterSchema)
  async register(@ZBody(RegisterSchema) body: z.infer<typeof RegisterSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(body, meta(req));
    setAuthCookies(res, this.config, tokens);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @ApiZodBody(LoginSchema)
  async login(@ZBody(LoginSchema) body: z.infer<typeof LoginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(body.login, body.password, meta(req));
    setAuthCookies(res, this.config, tokens);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@ZBody(RefreshSchema) body: z.infer<typeof RefreshSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = body.refreshToken ?? this.cookieToken(req);
    if (!token) throw new UnauthorizedException('No refresh token');
    const tokens = await this.auth.refresh(token, meta(req));
    setAuthCookies(res, this.config, tokens);
    return tokens;
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(body?.refreshToken ?? this.cookieToken(req));
    clearAuthCookies(res);
  }

  @HttpCode(204)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user.id);
    clearAuthCookies(res);
  }

  /** Public list of demo logins — only when the server runs in demo mode. */
  @Public()
  @Get('demo-accounts')
  demoAccounts() {
    if (!demoModeEnabled()) return { enabled: false, accounts: [] };
    return { enabled: true, password: DEMO_PASSWORD, accounts: DEMO_ACCOUNTS.map(({ email, label, description }) => ({ email, label, description })) };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  /** Reads the refresh cookie; cookie-based refresh must carry the CSRF header. */
  private cookieToken(req: Request): string | undefined {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (token && req.headers[CSRF_HEADER] !== '1') throw new ForbiddenException('Missing CSRF header');
    return token;
  }
}

function meta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}
