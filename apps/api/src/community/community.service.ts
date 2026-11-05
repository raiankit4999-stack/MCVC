import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { TenantDb } from '../common/tenant-db.service';
import { isOpenNow } from './hours';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService, private readonly tenantDb: TenantDb) {}

  /** This deployment's community. A deployment serves exactly one community. */
  async current() {
    const slug = process.env.COMMUNITY_SLUG;
    const community = await this.prisma.community.findFirst({ where: slug ? { slug } : {}, orderBy: { createdAt: 'asc' } });
    if (!community) throw new NotFoundException('Community is not configured — run the seed');
    return community;
  }

  async publicProfile() {
    const c = await this.current();
    const [stores, cities, associations] = await Promise.all([
      this.prisma.store.count({ where: { communityId: c.id, membershipStatus: 'ACTIVE', deletedAt: null } }),
      this.prisma.city.count({ where: { communityId: c.id, isActive: true } }),
      this.prisma.association.count({ where: { communityId: c.id } }),
    ]);
    const { network: _network, ...settings } = (c.settings ?? {}) as Record<string, unknown>;
    return { id: c.id, name: c.name, slug: c.slug, tagline: c.tagline, logoUrl: c.logoUrl, settings, stats: { stores, cities, associations } };
  }

  /** Parent-body content: team, events, gallery, service centres, useful links. */
  async network() {
    const c = await this.current();
    return ((c.settings ?? {}) as Record<string, unknown>).network ?? {};
  }

  /** Member stores that service brands, with authorisation badges. */
  async serviceCentres(q: { brand?: string; city?: string; status?: 'AUTHORISED' | 'THIRD_PARTY' | 'UNAUTHORISED' }) {
    const c = await this.current();
    const claim: Prisma.StoreBrandServiceWhereInput = { ...(q.brand ? { brand: q.brand } : {}), ...(q.status ? { status: q.status } : {}) };
    const stores = await this.prisma.store.findMany({
      where: { communityId: c.id, membershipStatus: 'ACTIVE', deletedAt: null, brandServices: { some: claim }, ...(q.city ? { city: { slug: q.city } } : {}) },
      include: STORE_CARD_INCLUDE,
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      take: 200,
    });
    const counts = await this.prisma.storeBrandService.groupBy({ by: ['brand'], where: { store: { communityId: c.id, membershipStatus: 'ACTIVE', deletedAt: null } }, _count: { _all: true } });
    const rank = { AUTHORISED: 0, THIRD_PARTY: 1, UNAUTHORISED: 2 } as const;
    const best = (st: (typeof stores)[number]) => Math.min(...st.brandServices.filter((b) => !q.brand || b.brand === q.brand).map((b) => rank[b.status] - (b.verified ? 0.5 : 0)));
    stores.sort((a, b) => best(a) - best(b) || a.name.localeCompare(b.name));
    return { items: stores.map(toStoreCard), brands: counts.map((b) => ({ brand: b.brand, stores: b._count._all })).sort((a, b) => b.stores - a.stores) };
  }

  async associations(zone?: string) {
    const c = await this.current();
    const list = await this.prisma.association.findMany({
      where: { communityId: c.id, ...(zone ? { zone } : {}) },
      orderBy: { sortOrder: 'asc' },
      include: { city: { select: { name: true, slug: true } }, _count: { select: { stores: { where: { deletedAt: null, membershipStatus: 'ACTIVE' } } } } },
    });
    return list.map(({ _count, ...a }) => ({ ...a, memberCount: _count.stores }));
  }

  async association(slug: string) {
    const c = await this.current();
    const a = await this.prisma.association.findFirst({ where: { communityId: c.id, slug }, include: { city: { select: { name: true, slug: true, stateCode: true } } } });
    if (!a) throw new NotFoundException('Association not found');
    const members = await this.prisma.store.findMany({
      where: { associationId: a.id, deletedAt: null, membershipStatus: 'ACTIVE' },
      orderBy: [{ websiteStatus: 'desc' }, { isVerified: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, isVerified: true, websiteStatus: true, area: { select: { name: true } } },
    });
    return { ...a, memberCount: members.length, members };
  }

  async cities() {
    const c = await this.current();
    const cities = await this.prisma.city.findMany({
      where: { communityId: c.id, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { stores: { where: { membershipStatus: 'ACTIVE', deletedAt: null } } } } },
    });
    return cities.map(({ _count, ...city }) => ({ ...city, storeCount: _count.stores }));
  }

  async areas(citySlug?: string) {
    const c = await this.current();
    return this.prisma.area.findMany({
      where: { isActive: true, city: { communityId: c.id, ...(citySlug ? { slug: citySlug } : {}) } },
      orderBy: { name: 'asc' },
      include: { city: { select: { slug: true, name: true } } },
    });
  }

  async categories() {
    const c = await this.current();
    return this.prisma.businessCategory.findMany({ where: { communityId: c.id }, orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async plans() {
    const c = await this.current();
    return this.prisma.membershipPlan.findMany({ where: { communityId: c.id, isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async directory(q: DirectoryQuery) {
    const c = await this.current();
    let productStoreIds: string[] | undefined;
    if (q.product) {
      // Product availability spans tenants: read only published, in-stock rows' storeIds.
      const rows = await this.tenantDb.platform((tx) =>
        tx.product.findMany({
          where: { isPublished: true, deletedAt: null, stockOnHand: { gt: 0 }, name: { contains: q.product, mode: 'insensitive' } },
          select: { storeId: true },
          distinct: ['storeId'],
          take: 500,
        }),
      );
      productStoreIds = rows.map((r) => r.storeId);
    }
    let serviceStoreIds: string[] | undefined;
    if (q.service) {
      const rows = await this.tenantDb.platform((tx) =>
        tx.service.findMany({
          where: { isPublished: true, deletedAt: null, name: { contains: q.service, mode: 'insensitive' } },
          select: { storeId: true },
          distinct: ['storeId'],
          take: 500,
        }),
      );
      serviceStoreIds = rows.map((r) => r.storeId);
    }
    const idFilter = [productStoreIds, serviceStoreIds].filter(Boolean) as string[][];
    const where: Prisma.StoreWhereInput = {
      communityId: c.id,
      membershipStatus: 'ACTIVE',
      deletedAt: null,
      ...(q.city ? { city: { slug: q.city } } : {}),
      ...(q.area ? { area: { slug: q.area } } : {}),
      ...(q.association ? { association: { slug: q.association } } : {}),
      ...(q.category ? { categories: { some: { category: { slug: q.category } } } } : {}),
      ...(q.verified ? { isVerified: true } : {}),
      ...(q.minRating ? { ratingAverage: { gte: q.minRating } } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { settings: { tagline: { contains: q.q, mode: 'insensitive' } } }] } : {}),
      ...(idFilter.length ? { AND: idFilter.map((ids) => ({ id: { in: ids } })) } : {}),
    };
    const [total, stores] = await Promise.all([
      this.prisma.store.count({ where }),
      this.prisma.store.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { isVerified: 'desc' }, { ratingAverage: 'desc' }, { name: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: STORE_CARD_INCLUDE,
      }),
    ]);
    let items = stores.map(toStoreCard);
    if (q.openNow) items = items.filter((s) => s.isOpen);
    return { total, page: q.page, pageSize: q.pageSize, items };
  }

  async featured() {
    const c = await this.current();
    const stores = await this.prisma.store.findMany({
      where: { communityId: c.id, membershipStatus: 'ACTIVE', deletedAt: null },
      orderBy: [{ isFeatured: 'desc' }, { websiteStatus: 'desc' }, { ratingAverage: 'desc' }, { createdAt: 'asc' }],
      take: 6,
      include: STORE_CARD_INCLUDE,
    });
    return stores.map(toStoreCard);
  }

  async storeProfile(slug: string) {
    const store = await this.prisma.store.findFirst({ where: { slug, membershipStatus: 'ACTIVE', deletedAt: null }, include: STORE_CARD_INCLUDE });
    if (!store) throw new NotFoundException('Store not found');
    const { services, products } = await this.tenantDb.run(store.id, async (tx) => ({
      services: await tx.service.findMany({ where: { storeId: store.id, isPublished: true, deletedAt: null }, orderBy: { name: 'asc' }, take: 20 }),
      products: await tx.product.findMany({
        where: { storeId: store.id, isPublished: true, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, name: true, brand: true, sellingPrice: true, mrp: true, imageUrl: true, condition: true, stockOnHand: true, specs: true },
      }),
    }));
    return {
      ...toStoreCard(store),
      email: store.email,
      phone: store.phone,
      addressLine: store.addressLine,
      about: store.settings?.about,
      businessHours: store.settings?.businessHours ?? [],
      whatsappNumber: store.settings?.whatsappNumber,
      socialLinks: store.settings?.socialLinks ?? {},
      services,
      products: products.map(({ stockOnHand, ...p }) => ({ ...p, inStock: stockOnHand > 0 })),
    };
  }
}

export interface DirectoryQuery {
  q?: string;
  city?: string;
  area?: string;
  category?: string;
  association?: string;
  product?: string;
  service?: string;
  verified?: boolean;
  openNow?: boolean;
  minRating?: number;
  page: number;
  pageSize: number;
}

const STORE_CARD_INCLUDE = {
  city: { select: { name: true, slug: true } },
  area: { select: { name: true, slug: true } },
  settings: true,
  categories: { include: { category: { select: { name: true, slug: true, kind: true } } } },
  domains: { where: { isPrimary: true, verificationStatus: 'VERIFIED' as const }, select: { hostname: true } },
  association: { select: { name: true, code: true, slug: true } },
  brandServices: { select: { brand: true, status: true, verified: true }, orderBy: [{ status: 'asc' }, { brand: 'asc' }] },
} satisfies Prisma.StoreInclude;

type StoreWithCard = Prisma.StoreGetPayload<{ include: typeof STORE_CARD_INCLUDE }>;

function toStoreCard(s: StoreWithCard) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    area: s.area,
    addressLine: s.addressLine,
    phone: s.phone,
    logoUrl: s.settings?.logoUrl ?? null,
    tagline: s.settings?.tagline ?? null,
    primaryColor: s.settings?.primaryColor ?? '#C2410C',
    isVerified: s.isVerified,
    isFeatured: s.isFeatured,
    rating: Number(s.ratingAverage),
    ratingCount: s.ratingCount,
    categories: s.categories.map((c) => c.category),
    websitePublished: s.websiteStatus === 'PUBLISHED',
    primaryDomain: s.domains[0]?.hostname ?? null,
    isOpen: isOpenNow(s.settings?.businessHours, s.timezone),
    association: s.association,
    brandServices: s.brandServices,
  };
}
