import { Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, CurrentUser, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { TenantDb } from '../common/tenant-db.service';
import { indianPhone, money, pagination, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { RepairsService } from './repairs.service';

const STATUSES = ['RECEIVED', 'DIAGNOSING', 'WAITING_FOR_APPROVAL', 'WAITING_FOR_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CANCELLED'] as const;
export const IntakeSchema = z.object({
  customerId: uuid.optional(),
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: indianPhone, email: z.email().optional() }).optional(),
  device: z.object({
    category: z.string().trim().min(2).max(40),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(120),
    serialNumber: z.string().trim().max(60).optional(),
    imei: z.string().regex(/^\d{15}$/).optional(),
  }),
  reportedProblem: z.string().trim().min(3).max(2000),
  physicalCondition: z.string().max(1000).optional(),
  accessories: z.array(z.string().max(60)).max(20).default([]),
  intakePhotos: z.array(z.url()).max(12).default([]),
  technicianId: uuid.optional(),
  estimatedDelivery: z.coerce.date().optional(),
  estimateAmount: money.optional(),
  warrantyDays: z.number().int().min(0).max(365).optional(),
  bookingId: uuid.optional(),
});
const StatusSchema = z.object({ status: z.enum(STATUSES), note: z.string().max(1000).optional(), isPublic: z.boolean().default(true), noCharge: z.boolean().default(false) });
const QuoteSchema = z.object({ diagnosis: z.string().trim().min(3).max(2000), estimateAmount: money, labourCharge: money.optional(), estimatedDelivery: z.coerce.date().optional() });
const EditSchema = z.object({ technicianId: uuid.nullable(), estimatedDelivery: z.coerce.date().nullable(), diagnosis: z.string().max(2000), finalAmount: money, physicalCondition: z.string().max(1000) }).partial();

@ApiTags('repairs')
@Controller('repair-jobs')
export class RepairsController {
  constructor(private readonly tenantDb: TenantDb, private readonly repairs: RepairsService) {}

  @Get()
  @StorePermission('repairs.read')
  list(@CurrentStore() store: StoreContext, @ZQuery(pagination.extend({ status: z.enum(STATUSES).optional(), active: z.enum(['true', 'false']).optional() })) q: { q?: string; status?: (typeof STATUSES)[number]; active?: string; page: number; pageSize: number }) {
    return this.tenantDb.run(store.id, async (tx) => {
      const where: Prisma.RepairJobWhereInput = {
        storeId: store.id,
        ...(q.status ? { status: q.status } : {}),
        ...(q.active === 'true' ? { status: { notIn: ['DELIVERED', 'CANCELLED'] } } : {}),
        ...(q.q
          ? { OR: [{ jobNumber: { contains: q.q, mode: 'insensitive' } }, { customer: { name: { contains: q.q, mode: 'insensitive' } } }, { customer: { phone: { contains: q.q } } }, { device: { serialNumber: { equals: q.q, mode: 'insensitive' } } }] }
          : {}),
      };
      const [total, items] = await Promise.all([
        tx.repairJob.count({ where }),
        tx.repairJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          include: { customer: { select: { name: true, phone: true } }, device: true, technician: { select: { name: true } } },
        }),
      ]);
      return { total, items };
    });
  }

  @Post()
  @StorePermission('repairs.write')
  @ApiZodBody(IntakeSchema)
  intake(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(IntakeSchema) body: z.infer<typeof IntakeSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.repairs.intake(tx, store, body, user.id));
  }

  @Get(':id')
  @StorePermission('repairs.read')
  get(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, async (tx) => {
      const job = await tx.repairJob.findFirst({
        where: { id, storeId: store.id },
        include: {
          customer: true,
          device: true,
          technician: true,
          updates: { orderBy: { createdAt: 'asc' } },
          parts: true,
        },
      });
      if (!job) throw new NotFoundException('Repair job not found');
      const { trackingTokenHash: _hidden, ...rest } = job;
      const invoices = await tx.invoice.findMany({ where: { storeId: store.id, repairJobId: id }, select: { id: true, invoiceNumber: true, docType: true, grandTotal: true, paymentStatus: true, status: true } });
      return { ...rest, invoices };
    });
  }

  @Patch(':id')
  @StorePermission('repairs.write')
  edit(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(EditSchema) body: z.infer<typeof EditSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const { count } = await tx.repairJob.updateMany({ where: { id, storeId: store.id }, data: body });
      if (!count) throw new NotFoundException('Repair job not found');
      return tx.repairJob.findUniqueOrThrow({ where: { id } });
    });
  }

  @Patch(':id/status')
  @StorePermission('repairs.status')
  @ApiZodBody(StatusSchema)
  status(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(StatusSchema) body: z.infer<typeof StatusSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.repairs.changeStatus(tx, store.id, id, body.status, { ...body, userId: user.id }));
  }

  @Post(':id/quote')
  @HttpCode(200)
  @StorePermission('repairs.write')
  @ApiZodBody(QuoteSchema)
  quote(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(QuoteSchema) body: z.infer<typeof QuoteSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.repairs.quote(tx, store.id, id, body, user.id));
  }

  @Post(':id/approval')
  @HttpCode(200)
  @StorePermission('repairs.write')
  approval(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(z.object({ decision: z.enum(['APPROVED', 'REJECTED']) })) body: { decision: 'APPROVED' | 'REJECTED' }) {
    return this.tenantDb.run(store.id, (tx) => this.repairs.decide(tx, store.id, id, body.decision, 'staff', user.id));
  }

  @Post(':id/parts')
  @StorePermission('repairs.write')
  part(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(z.object({ productId: uuid, quantity: z.number().int().positive().max(100), unitPrice: money.optional() })) body: { productId: string; quantity: number; unitPrice?: number }) {
    return this.tenantDb.run(store.id, (tx) => this.repairs.addPart(tx, store.id, id, body, user.id));
  }

  @Post(':id/tracking-link')
  @HttpCode(200)
  @StorePermission('repairs.write')
  async trackingLink(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    const token = await this.tenantDb.run(store.id, (tx) => this.repairs.regenerateTrackingToken(tx, store.id, id));
    return { trackingToken: token, path: `/track/${token}` };
  }
}
