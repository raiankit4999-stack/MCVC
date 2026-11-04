import { BadRequestException, ConflictException, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { APP_CONFIG, AppConfig } from '../config';
import { CurrentStore, CurrentUser, Public, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { AuditService } from '../common/audit.service';
import { randomToken } from '../common/crypto';
import { PrismaService } from '../common/prisma.service';
import { ApiZodBody, ZBody } from '../common/zod';
import { DNS_RESOLVER, DnsResolver } from '../domains/dns';
import { normalizeHost } from '../tenancy/host-resolver.service';

const HOSTNAME_RE = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
const DomainSchema = z.object({ hostname: z.string().transform(normalizeHost).refine((h) => HOSTNAME_RE.test(h), 'Enter a domain like abccomputers.in'), expiresAt: z.coerce.date().optional() });

export const CHALLENGE_PREFIX = '_mcvc-challenge';

@ApiTags('store-domains')
@Controller('store/domains')
export class DomainsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(DNS_RESOLVER) private readonly dns: DnsResolver,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  @StorePermission('domains.manage')
  async list(@CurrentStore() store: StoreContext) {
    const domains = await this.prisma.storeDomain.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'asc' } });
    return {
      platformHostname: `${store.slug}.${this.config.platformDomain}`,
      cnameTarget: this.config.domainCnameTarget,
      domains: domains.map((d) => ({ ...d, instructions: this.instructions(d.hostname, d.verificationToken) })),
    };
  }

  @Post()
  @StorePermission('domains.manage')
  @ApiZodBody(DomainSchema)
  async add(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(DomainSchema) body: z.infer<typeof DomainSchema>) {
    if (body.hostname.endsWith(`.${this.config.platformDomain}`) || body.hostname === this.config.platformDomain) {
      throw new BadRequestException('Platform subdomains are assigned automatically');
    }
    if (this.config.communityHosts.includes(body.hostname)) throw new BadRequestException('Reserved hostname');
    try {
      const d = await this.prisma.storeDomain.create({ data: { storeId: store.id, hostname: body.hostname, verificationToken: randomToken(18), expiresAt: body.expiresAt } });
      await this.audit.log({ tenantId: store.id, userId: user.id, action: 'domain.add', entityType: 'store_domain', entityId: d.id, metadata: { hostname: d.hostname } });
      return { ...d, instructions: this.instructions(d.hostname, d.verificationToken) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('This domain is already connected to a store');
      throw e;
    }
  }

  @Post(':id/verify')
  @HttpCode(200)
  @StorePermission('domains.manage')
  async verify(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const d = await this.prisma.storeDomain.findFirst({ where: { id, storeId: store.id } });
    if (!d) throw new NotFoundException('Domain not found');
    if (d.verificationStatus === 'SUSPENDED') throw new BadRequestException('Domain is suspended by the community administrator');

    const [txt, cname, a] = await Promise.all([this.dns.txt(`${CHALLENGE_PREFIX}.${d.hostname}`), this.dns.cname(d.hostname), this.dns.a(d.hostname)]);
    const ownership = txt.some((t) => t.trim() === `mcvc-verify=${d.verificationToken}`);
    const routed = cname.map(normalizeHost).includes(this.config.domainCnameTarget) || a.length > 0;
    const status = ownership ? 'VERIFIED' : 'FAILED';
    const updated = await this.prisma.$transaction(async (tx) => {
      const hasPrimary = await tx.storeDomain.count({ where: { storeId: store.id, isPrimary: true } });
      return tx.storeDomain.update({
        where: { id },
        data: { verificationStatus: status, lastCheckedAt: new Date(), verifiedAt: ownership ? new Date() : null, isPrimary: ownership && !hasPrimary ? true : d.isPrimary },
      });
    });
    await this.audit.log({ tenantId: store.id, userId: user.id, action: 'domain.verify', entityType: 'store_domain', entityId: id, metadata: { ownership, routed } });
    return { ...updated, checks: { ownership, routing: routed }, instructions: this.instructions(d.hostname, d.verificationToken) };
  }

  @Post(':id/primary')
  @HttpCode(200)
  @StorePermission('domains.manage')
  async makePrimary(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    const d = await this.prisma.storeDomain.findFirst({ where: { id, storeId: store.id } });
    if (!d) throw new NotFoundException('Domain not found');
    if (d.verificationStatus !== 'VERIFIED') throw new BadRequestException('Verify the domain first');
    await this.prisma.$transaction([
      this.prisma.storeDomain.updateMany({ where: { storeId: store.id, isPrimary: true }, data: { isPrimary: false } }),
      this.prisma.storeDomain.update({ where: { id }, data: { isPrimary: true } }),
    ]);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(204)
  @StorePermission('domains.manage')
  async remove(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const { count } = await this.prisma.storeDomain.deleteMany({ where: { id, storeId: store.id } });
    if (!count) throw new NotFoundException('Domain not found');
    await this.audit.log({ tenantId: store.id, userId: user.id, action: 'domain.remove', entityType: 'store_domain', entityId: id });
  }

  private instructions(hostname: string, token: string) {
    return [
      { type: 'TXT', name: `${CHALLENGE_PREFIX}.${hostname}`, value: `mcvc-verify=${token}`, purpose: 'Proves domain ownership' },
      { type: 'CNAME', name: hostname, value: this.config.domainCnameTarget, purpose: 'Routes traffic to your store website (use an A record / ALIAS for apex domains)' },
    ];
  }
}

/** Used by the edge proxy (e.g. Caddy on-demand TLS `ask`) before issuing a certificate. */
@ApiTags('internal')
@Controller('internal/domains')
export class DomainTlsController {
  constructor(private readonly prisma: PrismaService, @Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Public()
  @Get('tls-check')
  async tlsCheck(@Query('domain') domain = '') {
    const host = normalizeHost(domain);
    const suffix = `.${this.config.platformDomain}`;
    if (host.endsWith(suffix)) {
      const store = await this.prisma.store.findFirst({ where: { slug: host.slice(0, -suffix.length), membershipStatus: 'ACTIVE', deletedAt: null } });
      if (store) return { allowed: true };
    } else {
      const d = await this.prisma.storeDomain.findUnique({ where: { hostname: host }, include: { store: true } });
      if (d?.verificationStatus === 'VERIFIED' && d.store.membershipStatus === 'ACTIVE') return { allowed: true };
    }
    throw new NotFoundException();
  }
}
