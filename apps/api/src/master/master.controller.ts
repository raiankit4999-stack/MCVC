import { BadRequestException, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, PlatformRoles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { TenantDb } from '../common/tenant-db.service';
import { money, slug, slugify, stateCode, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { CommunityService } from '../community/community.service';
import { ProvisioningService } from '../membership/provisioning.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScopeService } from './scope.service';

const ALL_STAFF = ['SUPER_ADMIN', 'COMMUNITY_ADMIN', 'CITY_MANAGER', 'AREA_MANAGER'] as const;
const ADMINS = ['SUPER_ADMIN', 'COMMUNITY_ADMIN'] as const;

const CitySchema = z.object({ name: z.string().trim().min(2).max(80), slug: slug.optional(), state: z.string().trim().min(2).max(60), stateCode, isActive: z.boolean().optional() });
const AreaSchema = z.object({ cityId: uuid, name: z.string().trim().min(2).max(80), slug: slug.optional(), postalCode: z.string().regex(/^\d{6}$/).optional() });
const CategorySchema = z.object({ name: z.string().trim().min(2).max(80), slug: slug.optional(), kind: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'), parentId: uuid.optional(), sortOrder: z.number().int().default(0) });
const DecisionSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT']), note: z.string().trim().max(500).optional() });
const StoreStatusSchema = z.object({
  membershipStatus: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']).optional(),
  isVerified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});
const PlanSchema = z.object({
  code: slug,
  name: z.string().trim().min(2).max(60),
  description: z.string().max(500).optional(),
  priceMonthly: money,
  priceYearly: money,
  features: z.array(z.string().max(40)).max(40),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
const StaffSchema = z.object({
  email: z.email(),
  role: z.enum(['COMMUNITY_ADMIN', 'CITY_MANAGER', 'AREA_MANAGER']).nullable(),
  cityIds: z.array(uuid).default([]),
  areaIds: z.array(uuid).default([]),
});
const ListSchema = z.object({
  status: z.string().max(30).optional(),
  cityId: uuid.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

@ApiTags('master-admin')
@Controller('master')
export class MasterController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDb,
    private readonly community: CommunityService,
    private readonly scopes: ScopeService,
    private readonly provisioning: ProvisioningService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('dashboard')
  @PlatformRoles(...ALL_STAFF)
  async dashboard(@CurrentUser() user: AuthUser) {
    const c = await this.community.current();
    const scope = await this.scopes.forUser(user);
    const storeWhere: Prisma.StoreWhereInput = { communityId: c.id, deletedAt: null, ...this.scopes.storeWhere(scope) };
    const [total, active, suspended, pending, published, byCity, byArea, subs, renewals] = await Promise.all([
      this.prisma.store.count({ where: storeWhere }),
      this.prisma.store.count({ where: { ...storeWhere, membershipStatus: 'ACTIVE' } }),
      this.prisma.store.count({ where: { ...storeWhere, membershipStatus: 'SUSPENDED' } }),
      this.prisma.membershipApplication.count({ where: { communityId: c.id, status: 'PENDING', ...this.scopes.applicationWhere(scope) } }),
      this.prisma.store.count({ where: { ...storeWhere, websiteStatus: 'PUBLISHED' } }),
      this.prisma.store.groupBy({ by: ['cityId'], where: storeWhere, _count: { _all: true } }),
      this.prisma.store.groupBy({ by: ['areaId'], where: storeWhere, _count: { _all: true } }),
      this.prisma.subscription.findMany({ where: { store: storeWhere, status: { in: ['ACTIVE', 'TRIALING'] } }, include: { plan: true } }),
      this.prisma.subscription.count({ where: { store: storeWhere, status: { in: ['ACTIVE', 'TRIALING'] }, currentPeriodEnd: { lte: new Date(Date.now() + 14 * 86400_000) } } }),
    ]);
    const storeIds = (await this.prisma.store.findMany({ where: storeWhere, select: { id: true } })).map((s) => s.id);
    // Network-wide activity counts only — no tenant records are returned.
    const activity = await this.tenantDb.platform(async (tx) => ({
      bookings: await tx.booking.count({ where: { storeId: { in: storeIds } } }),
      inquiries: await tx.lead.count({ where: { storeId: { in: storeIds } } }),
      repairJobs: await tx.repairJob.count({ where: { storeId: { in: storeIds } } }),
    }));
    const cities = await this.prisma.city.findMany({ where: { communityId: c.id }, select: { id: true, name: true } });
    const areas = await this.prisma.area.findMany({ where: { id: { in: byArea.map((a) => a.areaId) } }, select: { id: true, name: true, city: { select: { name: true } } } });
    const mrr = subs.filter((s) => s.status === 'ACTIVE').reduce((acc, s) => acc + Number(s.billingCycle === 'MONTHLY' ? s.plan.priceMonthly : Number(s.plan.priceYearly) / 12), 0);
    return {
      stores: { total, active, suspended, websitesPublished: published },
      pendingApprovals: pending,
      activeMemberships: subs.length,
      renewalsDueIn14Days: renewals,
      monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
      activity,
      byCity: byCity.map((r) => ({ cityId: r.cityId, name: cities.find((x) => x.id === r.cityId)?.name, count: r._count._all })),
      byArea: byArea.map((r) => {
        const a = areas.find((x) => x.id === r.areaId);
        return { areaId: r.areaId, name: a?.name, city: a?.city.name, count: r._count._all };
      }),
    };
  }

  // ───── Cities & areas ─────

  @Get('cities')
  @PlatformRoles(...ALL_STAFF)
  async cities() {
    const c = await this.community.current();
    return this.prisma.city.findMany({
      where: { communityId: c.id },
      orderBy: { name: 'asc' },
      include: { areas: { orderBy: { name: 'asc' }, include: { _count: { select: { stores: true } } } }, _count: { select: { stores: true } } },
    });
  }

  @Post('cities')
  @PlatformRoles(...ADMINS)
  @ApiZodBody(CitySchema)
  async createCity(@CurrentUser() user: AuthUser, @ZBody(CitySchema) body: z.infer<typeof CitySchema>, @Req() req: Request) {
    const c = await this.community.current();
    const city = await this.unique(() => this.prisma.city.create({ data: { ...body, slug: body.slug ?? slugify(body.name), communityId: c.id } }), 'City already exists');
    await this.audit.log({ userId: user.id, action: 'city.create', entityType: 'city', entityId: city.id, metadata: body, ip: req.ip });
    return city;
  }

  @Patch('cities/:id')
  @PlatformRoles(...ADMINS)
  async updateCity(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(CitySchema.partial()) body: Partial<z.infer<typeof CitySchema>>) {
    const city = await this.prisma.city.update({ where: { id }, data: body });
    await this.audit.log({ userId: user.id, action: 'city.update', entityType: 'city', entityId: id, metadata: body });
    return city;
  }

  @Post('areas')
  @PlatformRoles(...ADMINS)
  @ApiZodBody(AreaSchema)
  async createArea(@CurrentUser() user: AuthUser, @ZBody(AreaSchema) body: z.infer<typeof AreaSchema>) {
    const c = await this.community.current();
    const city = await this.prisma.city.findFirst({ where: { id: body.cityId, communityId: c.id } });
    if (!city) throw new NotFoundException('City not found');
    const area = await this.unique(() => this.prisma.area.create({ data: { ...body, slug: body.slug ?? slugify(body.name) } }), 'Area already exists in this city');
    await this.audit.log({ userId: user.id, action: 'area.create', entityType: 'area', entityId: area.id, metadata: body });
    return area;
  }

  @Post('categories')
  @PlatformRoles(...ADMINS)
  @ApiZodBody(CategorySchema)
  async createCategory(@CurrentUser() user: AuthUser, @ZBody(CategorySchema) body: z.infer<typeof CategorySchema>) {
    const c = await this.community.current();
    const cat = await this.unique(() => this.prisma.businessCategory.create({ data: { ...body, slug: body.slug ?? slugify(body.name), communityId: c.id } }), 'Category already exists');
    await this.audit.log({ userId: user.id, action: 'category.create', entityType: 'category', entityId: cat.id, metadata: body });
    return cat;
  }

  // ───── Applications & stores ─────

  @Get('applications')
  @PlatformRoles(...ALL_STAFF)
  async applications(@CurrentUser() user: AuthUser, @ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    const c = await this.community.current();
    const scope = await this.scopes.forUser(user);
    const where: Prisma.MembershipApplicationWhereInput = {
      communityId: c.id,
      ...this.scopes.applicationWhere(scope),
      ...(q.status ? { status: q.status as never } : {}),
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.q ? { businessName: { contains: q.q, mode: 'insensitive' } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.membershipApplication.count({ where }),
      this.prisma.membershipApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { plan: { select: { name: true } }, association: { select: { name: true, code: true } } } }),
    ]);
    const cities = await this.prisma.city.findMany({ where: { id: { in: items.map((i) => i.cityId) } }, select: { id: true, name: true } });
    const areas = await this.prisma.area.findMany({ where: { id: { in: items.map((i) => i.areaId) } }, select: { id: true, name: true } });
    return {
      total,
      items: items.map((i) => ({ ...i, cityName: cities.find((x) => x.id === i.cityId)?.name, areaName: areas.find((x) => x.id === i.areaId)?.name })),
    };
  }

  @Patch('applications/:id/decision')
  @PlatformRoles(...ALL_STAFF)
  @ApiZodBody(DecisionSchema)
  async decide(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(DecisionSchema) body: z.infer<typeof DecisionSchema>, @Req() req: Request) {
    const scope = await this.scopes.forUser(user);
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the application row so two reviewers cannot both approve it.
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM membership_applications WHERE id = ${id}::uuid FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Application not found');
      const app = await tx.membershipApplication.findUniqueOrThrow({ where: { id } });
      this.scopes.assertCovers(scope, app.cityId, app.areaId);
      if (app.status !== 'PENDING') throw new ConflictException(`Application already ${app.status.toLowerCase()}`);

      if (body.decision === 'REJECT') {
        return tx.membershipApplication.update({ where: { id }, data: { status: 'REJECTED', reviewNote: body.note, reviewedById: user.id, reviewedAt: new Date() } });
      }
      const store = await this.provisioning.provision(tx, app);
      await this.audit.log({ tenantId: store.id, userId: user.id, action: 'store.provision', entityType: 'store', entityId: store.id, ip: req.ip }, tx);
      return tx.membershipApplication.update({ where: { id }, data: { status: 'APPROVED', reviewNote: body.note, reviewedById: user.id, reviewedAt: new Date(), storeId: store.id } });
    }, { timeout: 20000 });
    await this.audit.log({ userId: user.id, action: `application.${body.decision.toLowerCase()}`, entityType: 'membership_application', entityId: id, metadata: { note: body.note ?? null }, ip: req.ip });
    if (result.storeId) {
      await this.notifications.enqueue(result.storeId, { channel: 'EMAIL', recipient: result.email, template: 'membership.approved', payload: { businessName: result.businessName } });
    }
    return result;
  }

  @Get('stores')
  @PlatformRoles(...ALL_STAFF)
  async stores(@CurrentUser() user: AuthUser, @ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    const c = await this.community.current();
    const scope = await this.scopes.forUser(user);
    const where: Prisma.StoreWhereInput = {
      communityId: c.id,
      deletedAt: null,
      ...this.scopes.storeWhere(scope),
      ...(q.status ? { membershipStatus: q.status as never } : {}),
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.store.count({ where }),
      this.prisma.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          city: { select: { name: true } },
          area: { select: { name: true } },
          association: { select: { code: true, name: true } },
          brandServices: { orderBy: { brand: 'asc' } },
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: { select: { name: true } } } },
          domains: { select: { hostname: true, verificationStatus: true, isPrimary: true } },
        },
      }),
    ]);
    return { total, items };
  }

  @Patch('stores/:id/status')
  @PlatformRoles(...ALL_STAFF)
  @ApiZodBody(StoreStatusSchema)
  async storeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(StoreStatusSchema) body: z.infer<typeof StoreStatusSchema>, @Req() req: Request) {
    const scope = await this.scopes.forUser(user);
    const store = await this.prisma.store.findFirst({ where: { id, deletedAt: null } });
    if (!store) throw new NotFoundException('Store not found');
    this.scopes.assertCovers(scope, store.cityId, store.areaId);
    const { reason, ...data } = body;
    const updated = await this.prisma.store.update({ where: { id }, data });
    await this.audit.log({ tenantId: id, userId: user.id, action: 'store.status', entityType: 'store', entityId: id, metadata: { ...data, reason: reason ?? null }, ip: req.ip });
    return updated;
  }

  @Patch('stores/:id/brand-services/:brand')
  @PlatformRoles(...ALL_STAFF)
  async verifyBrand(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('brand') brand: string, @ZBody(z.object({ verified: z.boolean() })) body: { verified: boolean }) {
    const scope = await this.scopes.forUser(user);
    const store = await this.prisma.store.findFirst({ where: { id, deletedAt: null } });
    if (!store) throw new NotFoundException('Store not found');
    this.scopes.assertCovers(scope, store.cityId, store.areaId);
    const claim = await this.prisma.storeBrandService.findUnique({ where: { storeId_brand: { storeId: id, brand } } });
    if (!claim) throw new NotFoundException('This store has not declared that brand');
    const updated = await this.prisma.storeBrandService.update({ where: { id: claim.id }, data: { verified: body.verified, verifiedAt: body.verified ? new Date() : null } });
    await this.audit.log({ tenantId: id, userId: user.id, action: body.verified ? 'brand.verify' : 'brand.unverify', entityType: 'store_brand_service', entityId: claim.id, metadata: { brand, status: claim.status } });
    return updated;
  }

  // ───── Plans, subscriptions, domains ─────

  @Get('membership-plans')
  @PlatformRoles(...ADMINS)
  async plans() {
    const c = await this.community.current();
    return this.prisma.membershipPlan.findMany({ where: { communityId: c.id }, orderBy: { sortOrder: 'asc' }, include: { _count: { select: { subscriptions: true } } } });
  }

  @Post('membership-plans')
  @PlatformRoles(...ADMINS)
  @ApiZodBody(PlanSchema)
  async createPlan(@CurrentUser() user: AuthUser, @ZBody(PlanSchema) body: z.infer<typeof PlanSchema>) {
    const c = await this.community.current();
    const plan = await this.unique(() => this.prisma.membershipPlan.create({ data: { ...body, communityId: c.id } }), 'Plan code already exists');
    await this.audit.log({ userId: user.id, action: 'plan.create', entityType: 'membership_plan', entityId: plan.id, metadata: body });
    return plan;
  }

  @Patch('membership-plans/:id')
  @PlatformRoles(...ADMINS)
  async updatePlan(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(PlanSchema.partial()) body: Partial<z.infer<typeof PlanSchema>>) {
    const plan = await this.prisma.membershipPlan.update({ where: { id }, data: body });
    await this.audit.log({ userId: user.id, action: 'plan.update', entityType: 'membership_plan', entityId: id, metadata: body });
    return plan;
  }

  @Get('subscriptions')
  @PlatformRoles(...ADMINS)
  subscriptions(@ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    return this.prisma.subscription.findMany({
      where: q.status ? { status: q.status as never } : {},
      orderBy: { currentPeriodEnd: 'asc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { plan: { select: { name: true } }, store: { select: { name: true, slug: true } } },
    });
  }

  @Get('domains')
  @PlatformRoles(...ADMINS)
  domains() {
    return this.prisma.storeDomain.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { store: { select: { name: true, slug: true } } } });
  }

  @Get('audit-logs')
  @PlatformRoles(...ADMINS)
  auditLogs(@ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize });
  }

  // ───── Community staff ─────

  @Patch('staff')
  @PlatformRoles('SUPER_ADMIN', 'COMMUNITY_ADMIN')
  @ApiZodBody(StaffSchema)
  async assignStaff(@CurrentUser() user: AuthUser, @ZBody(StaffSchema) body: z.infer<typeof StaffSchema>) {
    const target = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!target) throw new NotFoundException('User must register first');
    if (target.platformRole === 'SUPER_ADMIN') throw new BadRequestException('Cannot change a super admin');
    if (body.role === 'COMMUNITY_ADMIN' && user.platformRole !== 'SUPER_ADMIN') throw new BadRequestException('Only a super admin can grant community admin');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: target.id }, data: { platformRole: body.role } }),
      this.prisma.adminScope.deleteMany({ where: { userId: target.id } }),
      ...body.cityIds.map((cityId) => this.prisma.adminScope.create({ data: { userId: target.id, cityId } })),
      ...body.areaIds.map((areaId) => this.prisma.adminScope.create({ data: { userId: target.id, areaId } })),
    ]);
    await this.audit.log({ userId: user.id, action: 'staff.assign', entityType: 'user', entityId: target.id, metadata: body });
    return { id: target.id, role: body.role, cityIds: body.cityIds, areaIds: body.areaIds };
  }

  private async unique<T>(fn: () => Promise<T>, message: string): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(message);
      throw e;
    }
  }
}
