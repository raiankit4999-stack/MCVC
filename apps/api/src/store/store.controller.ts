import { BadRequestException, Controller, Get, HttpCode, NotFoundException, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentStore, CurrentUser, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { TenantDb } from '../common/tenant-db.service';
import { hexColor, indianPhone } from '../common/validators';
import { ApiZodBody, ZBody } from '../common/zod';
import { BRAND_STATUSES, SERVICE_BRANDS } from '../common/brands';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const url = z.url().max(500);
const BrandingSchema = z
  .object({
    logoUrl: url.nullable(),
    faviconUrl: url.nullable(),
    tagline: z.string().max(160).nullable(),
    about: z.string().max(4000).nullable(),
    heroImageUrl: url.nullable(),
    heroHeadline: z.string().max(160).nullable(),
    primaryColor: hexColor,
    accentColor: hexColor,
    fontPreset: z.enum(['inter', 'geist', 'poppins', 'serif']),
    whatsappNumber: indianPhone.nullable(),
    socialLinks: z.record(z.enum(['facebook', 'instagram', 'youtube', 'x', 'linkedin', 'google']), url),
    businessHours: z.array(z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm })).max(21),
    footerText: z.string().max(500).nullable(),
    seoTitle: z.string().max(70).nullable(),
    seoDescription: z.string().max(160).nullable(),
    invoiceTerms: z.string().max(2000).nullable(),
    invoicePrefix: z.string().regex(/^[A-Z0-9-]{1,10}$/),
    jobCardPrefix: z.string().regex(/^[A-Z0-9-]{1,10}$/),
    bookingSlotMinutes: z.number().int().refine((n) => [15, 30, 45, 60, 90, 120].includes(n)),
    bookingSlotCapacity: z.number().int().min(1).max(50),
    allowedGstRates: z.array(z.number().min(0).max(100)).min(1).max(20),
  })
  .partial()
  .strict();

const ProfileSchema = z
  .object({ name: z.string().trim().min(2).max(120), phone: indianPhone, email: z.email(), addressLine: z.string().min(5).max(300), legalName: z.string().max(200).nullable() })
  .partial()
  .strict();

@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly prisma: PrismaService, private readonly tenantDb: TenantDb, private readonly audit: AuditService) {}

  @Get()
  @StorePermission('dashboard.view')
  async current(@CurrentStore() ctx: StoreContext) {
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: ctx.id },
      include: {
        settings: true,
        city: { select: { name: true } },
        area: { select: { name: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } },
      },
    });
    return { ...store, role: ctx.roleName, permissions: ctx.permissions };
  }

  @Patch('profile')
  @StorePermission('settings.manage')
  @ApiZodBody(ProfileSchema)
  async profile(@CurrentStore() ctx: StoreContext, @CurrentUser() user: AuthUser, @ZBody(ProfileSchema) body: z.infer<typeof ProfileSchema>) {
    const s = await this.prisma.store.update({ where: { id: ctx.id }, data: body });
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'store.profile', entityType: 'store', entityId: ctx.id, metadata: body });
    return s;
  }

  @Patch('branding')
  @StorePermission('settings.manage')
  @ApiZodBody(BrandingSchema)
  async branding(@CurrentStore() ctx: StoreContext, @CurrentUser() user: AuthUser, @ZBody(BrandingSchema) body: z.infer<typeof BrandingSchema>) {
    // The where clause pins the update to the caller's store — a store can only ever change its own settings.
    const s = await this.prisma.storeSettings.update({ where: { storeId: ctx.id }, data: body });
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'store.branding', entityType: 'store_settings', entityId: ctx.id, metadata: { fields: Object.keys(body) } });
    return s;
  }

  @Post('website/publish')
  @HttpCode(200)
  @StorePermission('website.publish')
  async publish(@CurrentStore() ctx: StoreContext, @CurrentUser() user: AuthUser) {
    const settings = await this.prisma.storeSettings.findUnique({ where: { storeId: ctx.id } });
    if (!settings) throw new NotFoundException();
    const sub = await this.prisma.subscription.findFirst({ where: { storeId: ctx.id, status: { in: ['ACTIVE', 'TRIALING'] }, currentPeriodEnd: { gt: new Date() } } });
    if (!sub) throw new BadRequestException('An active subscription is required to publish the website');
    const s = await this.prisma.store.update({ where: { id: ctx.id }, data: { websiteStatus: 'PUBLISHED' } });
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'website.publish', entityType: 'store', entityId: ctx.id });
    return { websiteStatus: s.websiteStatus };
  }

  @Post('website/unpublish')
  @HttpCode(200)
  @StorePermission('website.publish')
  async unpublish(@CurrentStore() ctx: StoreContext, @CurrentUser() user: AuthUser) {
    const s = await this.prisma.store.update({ where: { id: ctx.id }, data: { websiteStatus: 'UNPUBLISHED' } });
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'website.unpublish', entityType: 'store', entityId: ctx.id });
    return { websiteStatus: s.websiteStatus };
  }

  @Get('brand-services')
  @StorePermission('settings.manage')
  async brandServices(@CurrentStore() ctx: StoreContext) {
    const items = await this.prisma.storeBrandService.findMany({ where: { storeId: ctx.id }, orderBy: { brand: 'asc' } });
    return { brands: SERVICE_BRANDS, items };
  }

  /** Replaces the store's brand list. Changing a claim's status clears its verification. */
  @Put('brand-services')
  @StorePermission('settings.manage')
  async setBrandServices(
    @CurrentStore() ctx: StoreContext,
    @CurrentUser() user: AuthUser,
    @ZBody(z.object({ items: z.array(z.object({ brand: z.enum(SERVICE_BRANDS), status: z.enum(BRAND_STATUSES) })).max(SERVICE_BRANDS.length) })) body: { items: { brand: string; status: (typeof BRAND_STATUSES)[number] }[] },
  ) {
    const existing = await this.prisma.storeBrandService.findMany({ where: { storeId: ctx.id } });
    const wanted = new Map(body.items.map((i) => [i.brand, i.status]));
    await this.prisma.$transaction([
      this.prisma.storeBrandService.deleteMany({ where: { storeId: ctx.id, brand: { notIn: [...wanted.keys()] } } }),
      ...[...wanted].map(([brand, status]) => {
        const prev = existing.find((e) => e.brand === brand);
        const keep = prev?.status === status;
        return this.prisma.storeBrandService.upsert({
          where: { storeId_brand: { storeId: ctx.id, brand } },
          create: { storeId: ctx.id, brand, status },
          update: { status, ...(keep ? {} : { verified: false, verifiedAt: null }) },
        });
      }),
    ]);
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'store.brand_services', entityType: 'store', entityId: ctx.id, metadata: { items: body.items } });
    return this.brandServices(ctx);
  }

  @Get('roles')
  @StorePermission('staff.manage')
  roles(@CurrentStore() ctx: StoreContext) {
    return this.prisma.storeRole.findMany({ where: { storeId: ctx.id }, orderBy: { name: 'asc' } });
  }

  @Get('members')
  @StorePermission('staff.manage')
  members(@CurrentStore() ctx: StoreContext) {
    return this.prisma.storeUser.findMany({
      where: { storeId: ctx.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true } }, role: { select: { id: true, name: true } } },
    });
  }

  @Post('members')
  @StorePermission('staff.manage')
  async addMember(@CurrentStore() ctx: StoreContext, @CurrentUser() user: AuthUser, @ZBody(z.object({ email: z.email(), roleId: z.uuid() })) body: { email: string; roleId: string }) {
    const [target, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } }),
      this.prisma.storeRole.findFirst({ where: { id: body.roleId, storeId: ctx.id } }),
    ]);
    if (!target) throw new NotFoundException('The staff member must register an account first');
    if (!role) throw new NotFoundException('Role not found');
    const m = await this.prisma.storeUser.upsert({
      where: { storeId_userId: { storeId: ctx.id, userId: target.id } },
      create: { storeId: ctx.id, userId: target.id, roleId: role.id },
      update: { roleId: role.id, isActive: true },
    });
    await this.audit.log({ tenantId: ctx.id, userId: user.id, action: 'staff.add', entityType: 'store_user', entityId: m.id, metadata: { email: body.email, role: role.name } });
    return m;
  }

  @Get('employees')
  @StorePermission('employees.read')
  employees(@CurrentStore() ctx: StoreContext) {
    return this.tenantDb.run(ctx.id, (tx) => tx.employee.findMany({ where: { storeId: ctx.id, isActive: true }, orderBy: { name: 'asc' } }));
  }

  @Post('employees')
  @StorePermission('employees.write')
  createEmployee(
    @CurrentStore() ctx: StoreContext,
    @ZBody(z.object({ name: z.string().trim().min(2).max(100), phone: indianPhone.optional(), designation: z.string().max(60), isTechnician: z.boolean().default(false) }))
    body: { name: string; phone?: string; designation: string; isTechnician: boolean },
  ) {
    return this.tenantDb.run(ctx.id, (tx) => tx.employee.create({ data: { ...body, storeId: ctx.id } }));
  }
}
