function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function list(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export interface AppConfig {
  port: number;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  platformDomain: string;
  communityHosts: string[];
  domainCnameTarget: string;
  corsOrigins: string[];
  cookieSecure: boolean;
  isProduction: boolean;
}

export function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const devDefault = isProduction ? undefined : 'dev-only-insecure-secret';
  const config: AppConfig = {
    port: Number(process.env.PORT ?? 4000),
    jwtAccessSecret: required('JWT_ACCESS_SECRET', devDefault),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET', devDefault),
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    platformDomain: (process.env.PLATFORM_DOMAIN ?? 'mcvc.localhost').toLowerCase(),
    communityHosts: list('COMMUNITY_HOSTS', 'localhost,mcvc.localhost'),
    domainCnameTarget: (process.env.DOMAIN_CNAME_TARGET ?? 'stores.mcvc.example').toLowerCase(),
    corsOrigins: list('CORS_ORIGINS', 'http://localhost:3000'),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    isProduction,
  };
  if (isProduction && config.jwtAccessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production');
  }
  return config;
}

export const APP_CONFIG = Symbol('APP_CONFIG');
