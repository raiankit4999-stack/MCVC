import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, CurrentUser, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { TenantDb } from '../common/tenant-db.service';
import { gstin, hsnSac, indianPhone, money, pagination, stateCode, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { InvoicesService } from './invoices.service';

const METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'GATEWAY'] as const;
const PaymentLine = z.object({ amount: money, method: z.enum(METHODS), reference: z.string().max(100).optional() });
export const InvoiceSchema = z.object({
  docType: z.enum(['TAX_INVOICE', 'BILL_OF_SUPPLY', 'QUOTATION', 'PROFORMA']).default('TAX_INVOICE'),
  customerId: uuid.optional(),
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: indianPhone, email: z.email().optional(), gstin: gstin.optional(), stateCode: stateCode.optional() }).optional(),
  placeOfSupply: stateCode.optional(),
  pricesIncludeTax: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: uuid.optional(),
        serviceId: uuid.optional(),
        description: z.string().trim().min(1).max(300).optional(),
        hsnSac: hsnSac.optional(),
        quantity: z.number().positive().max(100000).refine((n) => Math.round(n * 1000) === n * 1000, 'Max 3 decimals'),
        unitPrice: money.optional(),
        discount: money.optional(),
        gstRate: z.number().min(0).max(100).optional(),
        serialNumbers: z.array(z.string().trim().min(1).max(60)).max(1000).optional(),
      }),
    )
    .min(1)
    .max(200),
  payments: z.array(PaymentLine).max(10).default([]),
  repairJobId: uuid.optional(),
  notes: z.string().max(2000).optional(),
  dueAt: z.coerce.date().optional(),
});

const ListSchema = pagination.extend({
  docType: z.enum(['TAX_INVOICE', 'BILL_OF_SUPPLY', 'QUOTATION', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE', 'DELIVERY_CHALLAN']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(private readonly tenantDb: TenantDb, private readonly invoices: InvoicesService) {}

  @Get('invoices')
  @StorePermission('invoices.read')
  list(@CurrentStore() store: StoreContext, @ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const where: Prisma.InvoiceWhereInput = {
        storeId: store.id,
        ...(q.docType ? { docType: q.docType } : {}),
        ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
        issuedAt: { gte: q.from, lte: q.to },
        ...(q.q ? { OR: [{ invoiceNumber: { contains: q.q, mode: 'insensitive' } }, { customer: { name: { contains: q.q, mode: 'insensitive' } } }, { customer: { phone: { contains: q.q } } }] } : {}),
      };
      const [total, items] = await Promise.all([
        tx.invoice.count({ where }),
        tx.invoice.findMany({ where, orderBy: { issuedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { customer: { select: { name: true, phone: true } } } }),
      ]);
      return { total, items };
    });
  }

  @Post('invoices')
  @StorePermission('invoices.write')
  @ApiZodBody(InvoiceSchema)
  create(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(InvoiceSchema) body: z.infer<typeof InvoiceSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.invoices.create(tx, store, body, user.id));
  }

  @Get('invoices/:id')
  @StorePermission('invoices.read')
  get(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, (tx) => this.invoices.get(tx, store.id, id));
  }

  @Post('invoices/:id/cancel')
  @HttpCode(200)
  @StorePermission('invoices.cancel')
  cancel(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZBody(z.object({ reason: z.string().trim().min(3).max(300) })) body: { reason: string }) {
    return this.tenantDb.run(store.id, (tx) => this.invoices.cancel(tx, store.id, id, body.reason, user.id));
  }

  @Post('payments')
  @StorePermission('payments.write')
  @ApiZodBody(PaymentLine.extend({ invoiceId: uuid }))
  pay(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(PaymentLine.extend({ invoiceId: uuid })) body: z.infer<typeof PaymentLine> & { invoiceId: string }) {
    return this.tenantDb.run(store.id, (tx) => this.invoices.recordPayment(tx, store.id, body.invoiceId, body, user.id));
  }
}
