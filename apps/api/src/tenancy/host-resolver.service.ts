import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../config';
import { PrismaService } from '../common/prisma.service';

export interface ResolvedStore {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  stateCode: string;
  websiteStatus: string;
}

/**
 * Maps an incoming hostname to a store:
 *   <slug>.<PLATFORM_DOMAIN>  → store by slug
 *   any other hostname        → store_domains row with VERIFIED status
 *
 * The store website frontend forwards the visitor's hostname in X-Store-Host.
 * Only public data is served from host-resolved context, and only for stores
 * with an active membership and a published website.
 */
@Injectable()
export class HostResolver {
  constructor(private readonly prisma: PrismaService, @Inject(APP_CONFIG) private readonly config: AppConfig) {}

  hostFromRequest(req: Request): string {
    const raw = (req.headers['x-store-host'] as string | undefined) ?? (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? '';
    return normalizeHost(raw.split(',')[0]);
  }

  async resolve(hostname: string, opts: { requirePublished?: boolean } = {}): Promise<ResolvedStore> {
    const host = normalizeHost(hostname);
    const suffix = `.${this.config.platformDomain}`;
    let store;
    if (host.endsWith(suffix)) {
      const slug = host.slice(0, -suffix.length);
      store = await this.prisma.store.findFirst({ where: { slug, deletedAt: null } });
    } else {
      const domain = await this.prisma.storeDomain.findUnique({ where: { hostname: host }, include: { store: true } });
      store = domain?.verificationStatus === 'VERIFIED' && !domain.store.deletedAt ? domain.store : null;
    }
    if (!store || store.membershipStatus !== 'ACTIVE') throw new NotFoundException('Store not found');
    if ((opts.requirePublished ?? true) && store.websiteStatus !== 'PUBLISHED') throw new NotFoundException('Store website is not published');
    return { id: store.id, slug: store.slug, name: store.name, timezone: store.timezone, stateCode: store.stateCode, websiteStatus: store.websiteStatus };
  }

  async fromRequest(req: Request) {
    return this.resolve(this.hostFromRequest(req));
  }
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}
