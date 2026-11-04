import type { CookieOptions, Response } from 'express';
import type { AppConfig } from '../config';

export const ACCESS_COOKIE = 'mcvc_at';
export const REFRESH_COOKIE = 'mcvc_rt';

export function setAuthCookies(res: Response, config: AppConfig, tokens: { accessToken: string; refreshToken: string }) {
  const base: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure };
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, path: '/', maxAge: config.accessTokenTtlSeconds * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, path: '/api/v1/auth', maxAge: config.refreshTokenTtlDays * 86400_000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}
