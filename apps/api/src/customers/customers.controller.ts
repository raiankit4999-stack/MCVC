import { ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, StorePermission } from '../auth/decorators';
import type { StoreContext } from '../auth/types';
import { TenantDb } from '../common/tenant-db.service';
import { gstin, indianPhone, pagination, stateCode } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';

const CustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: indianPhone,
  email: z.email().optional(),
  gstin: gstin.optional(),
  stateCode: stateCode.optional(),
  address: z.string().max(400).optional(),
  group: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  marketingConsent: z.boolean().default(false),
});
const LeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: indianPhone,
  email: z.email().optional(),
  source: z.string().max(40).default('walk-in'),
  message: z.string().max(2000).optional(),
  followUpAt: z.coerce.date().optional(),
});
const LeadUpdateSchema = z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']).optional(), followUpAt: z.coerce.date().nullable().optional(), message: z.string().max(2000).optional() });

@ApiTags('crm')
@Controller()
export class CustomersController {
  constructor(private readonly tenantDb: TenantDb) {}

  /** Search by name, phone, email, invoice number or device serial number. */
  @Get('customers')
  @StorePermission('customers.read')
  list(@CurrentStore() store: StoreContext, @ZQuery(pagination) q: z.infer<typeof pagination>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const term = q.q;
      const digits = term?.replace(/\D/g, '');
      const where: Prisma.CustomerWhereInput = {
        storeId: store.id,
        deletedAt: null,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                ...(digits && digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
                { invoices: { some: { invoiceNumber: { equals: term, mode: 'insensitive' } } } },
                { repairJobs: { some: { device: { serialNumber: { equals: term, mode: 'insensitive' } } } } },
              ],
            }
          : {}),
      };
      const [total, items] = await Promise.all([
        tx.customer.count({ where }),
        tx.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { _count: { select: { invoices: true, repairJobs: true } } } }),
      ]);
      return { total, items };
    });
  }

  @Post('customers')
  @StorePermission('customers.write')
  @ApiZodBody(CustomerSchema)
  create(@CurrentStore() store: StoreContext, @ZBody(CustomerSchema) body: z.infer<typeof CustomerSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const dup = await tx.customer.findUnique({ where: { storeId_phone: { storeId: store.id, phone: body.phone } } });
      if (dup) throw new ConflictException('A customer with this phone number already exists');
      return tx.customer.create({
        data: { ...body, storeId: store.id, stateCode: body.stateCode ?? body.gstin?.slice(0, 2), consentAt: body.marketingConsent ? new Date() : null },
      });
    });
  }

  @Get('customers/:id')
  @StorePermission('customers.read')
  profile(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, async (tx) => {
      const c = await tx.customer.findFirst({
        where: { id, storeId: store.id, deletedAt: null },
        include: {
          invoices: { orderBy: { issuedAt: 'desc' }, take: 50, select: { id: true, invoiceNumber: true, docType: true, issuedAt: true, grandTotal: true, amountPaid: true, paymentStatus: true, status: true } },
          repairJobs: { orderBy: { createdAt: 'desc' }, take: 50, include: { device: true } },
          bookings: { orderBy: { slotStart: 'desc' }, take: 50, include: { service: { select: { name: true } } } },
        },
      });
      if (!c) throw new NotFoundException('Customer not found');
      const billed = c.invoices.filter((i) => i.status === 'ISSUED' && ['TAX_INVOICE', 'BILL_OF_SUPPLY'].includes(i.docType));
      const lifetimeValue = billed.reduce((a, i) => a.add(i.grandTotal), new Prisma.Decimal(0));
      const outstanding = billed.reduce((a, i) => a.add(i.grandTotal.sub(i.amountPaid)), new Prisma.Decimal(0));
      return { ...c, stats: { lifetimeValue: lifetimeValue.toFixed(2), outstanding: outstanding.toFixed(2), invoiceCount: billed.length, isRepeat: billed.length + c.repairJobs.length > 1 } };
    });
  }

  @Patch('customers/:id')
  @StorePermission('customers.write')
  update(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(CustomerSchema.partial()) body: Partial<z.infer<typeof CustomerSchema>>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const { count } = await tx.customer.updateMany({
        where: { id, storeId: store.id, deletedAt: null },
        data: { ...body, ...(body.marketingConsent !== undefined ? { consentAt: body.marketingConsent ? new Date() : null } : {}) },
      });
      if (!count) throw new NotFoundException('Customer not found');
      return tx.customer.findUniqueOrThrow({ where: { id } });
    });
  }

  @Get('leads')
  @StorePermission('leads.read')
  leads(@CurrentStore() store: StoreContext, @ZQuery(pagination.extend({ status: z.string().optional() })) q: { status?: string; page: number; pageSize: number }) {
    return this.tenantDb.run(store.id, (tx) =>
      tx.lead.findMany({ where: { storeId: store.id, ...(q.status ? { status: q.status as never } : {}) }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    );
  }

  @Post('leads')
  @StorePermission('leads.write')
  @ApiZodBody(LeadSchema)
  createLead(@CurrentStore() store: StoreContext, @ZBody(LeadSchema) body: z.infer<typeof LeadSchema>) {
    return this.tenantDb.run(store.id, (tx) => tx.lead.create({ data: { ...body, storeId: store.id } }));
  }

  @Patch('leads/:id')
  @StorePermission('leads.write')
  updateLead(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(LeadUpdateSchema) body: z.infer<typeof LeadUpdateSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const { count } = await tx.lead.updateMany({ where: { id, storeId: store.id }, data: body });
      if (!count) throw new NotFoundException('Lead not found');
      return tx.lead.findUniqueOrThrow({ where: { id } });
    });
  }
}
