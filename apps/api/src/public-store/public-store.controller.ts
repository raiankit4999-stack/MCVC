import { Controller, Get, HttpCode, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { Public } from '../auth/decorators';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../common/prisma.service';
import { TenantDb } from '../common/tenant-db.service';
import { indianPhone, pagination, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { NotificationsService } from '../notifications/notifications.service';
import { RepairsService } from '../repairs/repairs.service';
import { HostResolver } from '../tenancy/host-resolver.service';

const contact = { name: z.string().trim().min(2).max(120), phone: indianPhone, email: z.email().optional() };
const InquirySchema = z.object({ ...contact, message: z.string().trim().min(3).max(2000), productId: uuid.optional() });
const BookingSchema = z.object({
  ...contact,
  serviceId: uuid.optional(),
  slotStart: z.coerce.date(),
  deviceType: z.string().max(60).optional(),
  deviceModel: z.string().max(120).optional(),
  problem: z.string().max(2000).optional(),
  pickupRequired: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Public APIs for individual store websites. The store is resolved from the
 * visitor's hostname (X-Store-Host, forwarded by the website frontend) — never
 * from a client-supplied store id.
 */
@ApiTags('public-store')
@ApiHeader({ name: 'X-Store-Host', required: true, description: 'Hostname the visitor used, e.g. abccomputers.in' })
@Public()
@Controller('public/store')
export class PublicStoreController {
  constructor(
    private readonly hosts: HostResolver,
    private readonly tenantDb: TenantDb,
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly repairs: RepairsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async profile(@Req() req: Request) {
    const s = await this.hosts.fromRequest(req);
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: s.id },
      include: { settings: true, city: { select: { name: true } }, area: { select: { name: true } }, domains: { where: { isPrimary: true, verificationStatus: 'VERIFIED' }, select: { hostname: true } } },
    });
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      phone: store.phone,
      email: store.email,
      addressLine: store.addressLine,
      city: store.city.name,
      area: store.area.name,
      gstin: store.gstin,
      isVerified: store.isVerified,
      rating: Number(store.ratingAverage),
      ratingCount: store.ratingCount,
      primaryDomain: store.domains[0]?.hostname ?? null,
      branding: store.settings && {
        logoUrl: store.settings.logoUrl,
        faviconUrl: store.settings.faviconUrl,
        tagline: store.settings.tagline,
        about: store.settings.about,
        heroImageUrl: store.settings.heroImageUrl,
        heroHeadline: store.settings.heroHeadline,
        primaryColor: store.settings.primaryColor,
        accentColor: store.settings.accentColor,
        fontPreset: store.settings.fontPreset,
        whatsappNumber: store.settings.whatsappNumber,
        socialLinks: store.settings.socialLinks,
        businessHours: store.settings.businessHours,
        footerText: store.settings.footerText,
        seoTitle: store.settings.seoTitle,
        seoDescription: store.settings.seoDescription,
      },
    };
  }

  @Get('products')
  async products(@Req() req: Request, @ZQuery(pagination) q: z.infer<typeof pagination>) {
    const s = await this.hosts.fromRequest(req);
    return this.tenantDb.run(s.id, async (tx) => {
      const where = { storeId: s.id, isPublished: true, deletedAt: null, ...(q.q ? { name: { contains: q.q, mode: 'insensitive' as const } } : {}) };
      const items = await tx.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: { id: true, name: true, brand: true, modelNumber: true, description: true, imageUrl: true, mrp: true, sellingPrice: true, condition: true, specs: true, warrantyMonths: true, stockOnHand: true, category: { select: { name: true } } },
      });
      return { total: await tx.product.count({ where }), items: items.map(({ stockOnHand, ...p }) => ({ ...p, inStock: stockOnHand > 0 })) };
    });
  }

  @Get('products/:id')
  async product(@Req() req: Request, @Param('id') id: string) {
    const s = await this.hosts.fromRequest(req);
    if (!uuid.safeParse(id).success) throw new NotFoundException();
    return this.tenantDb.run(s.id, async (tx) => {
      const p = await tx.product.findFirst({
        where: { id, storeId: s.id, isPublished: true, deletedAt: null },
        select: { id: true, name: true, brand: true, modelNumber: true, description: true, imageUrl: true, mrp: true, sellingPrice: true, condition: true, specs: true, warrantyMonths: true, stockOnHand: true, hsnCode: true, gstRate: true },
      });
      if (!p) throw new NotFoundException('Product not found');
      const { stockOnHand, ...rest } = p;
      return { ...rest, inStock: stockOnHand > 0 };
    });
  }

  @Get('services')
  async services(@Req() req: Request) {
    const s = await this.hosts.fromRequest(req);
    return this.tenantDb.run(s.id, (tx) =>
      tx.service.findMany({
        where: { storeId: s.id, isPublished: true, deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, description: true, price: true, priceIsStarting: true, durationMinutes: true, isBookable: true },
      }),
    );
  }

  @Get('slots')
  async slots(@Req() req: Request, @ZQuery(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })) q: { date: string }) {
    const s = await this.hosts.fromRequest(req);
    return this.tenantDb.run(s.id, (tx) => this.bookings.availability(tx, s.id, s.timezone, q.date));
  }

  @Post('inquiries')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodBody(InquirySchema)
  async inquiry(@Req() req: Request, @ZBody(InquirySchema) body: z.infer<typeof InquirySchema>) {
    const s = await this.hosts.fromRequest(req);
    const lead = await this.tenantDb.run(s.id, (tx) =>
      tx.lead.create({ data: { storeId: s.id, name: body.name, phone: body.phone, email: body.email, message: body.message, source: body.productId ? `website:product:${body.productId}` : 'website' } }),
    );
    return { id: lead.id, received: true };
  }

  @Post('bookings')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodBody(BookingSchema)
  async book(@Req() req: Request, @ZBody(BookingSchema) body: z.infer<typeof BookingSchema>) {
    const s = await this.hosts.fromRequest(req);
    const booking = await this.tenantDb.run(s.id, async (tx) => {
      const b = await this.bookings.create(tx, s.id, s.timezone, {
        customer: { name: body.name, phone: body.phone, email: body.email },
        serviceId: body.serviceId,
        slotStart: body.slotStart,
        deviceType: body.deviceType,
        deviceModel: body.deviceModel,
        problem: body.problem,
        pickupRequired: body.pickupRequired,
        notes: body.notes,
        status: 'PENDING_CONFIRMATION',
      });
      await this.notifications.enqueue(s.id, { channel: 'WHATSAPP', recipient: body.phone, template: 'booking.received', payload: { reference: b.reference, slotStart: b.slotStart.toISOString(), store: s.name } }, tx);
      return b;
    });
    return { reference: booking.reference, status: booking.status, slotStart: booking.slotStart, service: booking.service?.name ?? null };
  }

  @Get('repair-tracking/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async track(@Req() req: Request, @Param('token') token: string) {
    const s = await this.hosts.fromRequest(req);
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new NotFoundException('Tracking link is invalid or expired');
    const { jobId: _id, ...view } = await this.tenantDb.run(s.id, (tx) => this.repairs.publicView(tx, s.id, token));
    return view;
  }

  @Post('repair-tracking/:token/approval')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async approve(@Req() req: Request, @Param('token') token: string, @ZBody(z.object({ decision: z.enum(['APPROVED', 'REJECTED']) })) body: { decision: 'APPROVED' | 'REJECTED' }) {
    const s = await this.hosts.fromRequest(req);
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new NotFoundException('Tracking link is invalid or expired');
    return this.tenantDb.run(s.id, async (tx) => {
      const view = await this.repairs.publicView(tx, s.id, token);
      await this.repairs.decide(tx, s.id, view.jobId, body.decision, 'customer');
      const { jobId: _id, ...fresh } = await this.repairs.publicView(tx, s.id, token);
      return fresh;
    });
  }
}
