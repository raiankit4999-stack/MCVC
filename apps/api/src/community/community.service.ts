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
    const [stores, cities] = await Promise.all([
      this.prisma.store.count({ where: { communityId: c.id, membershipStatus: 'ACTIVE', deletedAt: null } }),
      this.prisma.city.count({ where: { communityId: c.id, isActive: true } }),
    ]);
    return { id: c.id, name: c.name, slug: c.slug, tagline: c.tagline, logoUrl: c.logoUrl, settings: c.settings, stats: { stores, cities } };
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
      orderBy: [{ isFeatured: 'desc' }, { ratingAverage: 'desc' }],
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
    primaryColor: s.settings?.primaryColor ?? '#2563EB',
    isVerified: s.isVerified,
    isFeatured: s.isFeatured,
    rating: Number(s.ratingAverage),
    ratingCount: s.ratingCount,
    categories: s.categories.map((c) => c.category),
    websitePublished: s.websiteStatus === 'PUBLISHED',
    primaryDomain: s.domains[0]?.hostname ?? null,
    isOpen: isOpenNow(s.settings?.businessHours, s.timezone),
  };
}
