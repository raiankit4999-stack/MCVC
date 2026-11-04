import { NextRequest, NextResponse } from 'next/server';

const COMMUNITY_HOSTS = (process.env.COMMUNITY_HOSTS ?? 'localhost,127.0.0.1,mcvc.localhost')
  .split(',')
  .map((h) => h.trim().toLowerCase());

/**
 * Multi-domain routing. Community hosts serve the community site, admin and ERP.
 * Every other host (a store's platform subdomain or verified custom domain) is
 * rewritten to /site/<host>/..., which renders that store's branded website.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (!host || COMMUNITY_HOSTS.includes(host)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/site/${host}${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`;
  const res = NextResponse.rewrite(url, { request: { headers: new Headers({ ...Object.fromEntries(req.headers), 'x-site-rewritten': '1' }) } });
  return res;
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|robots.txt).*)'],
};
