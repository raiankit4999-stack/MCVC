import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, StorePermission } from '../auth/decorators';
import type { StoreContext } from '../auth/types';
import { TenantDb, Tx } from '../common/tenant-db.service';
import { startOfDayInZone } from '../common/time';
import { ZQuery } from '../common/zod';

const RangeSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const SALE_TYPES = ['TAX_INVOICE', 'BILL_OF_SUPPLY'] as const;
const D = (v: Prisma.Decimal | null | undefined) => Number(v ?? 0);

@ApiTags('dashboard-reports')
@Controller()
export class DashboardController {
  constructor(private readonly tenantDb: TenantDb) {}

  @Get('dashboard')
  @StorePermission('dashboard.view')
  dashboard(@CurrentStore() store: StoreContext, @ZQuery(RangeSchema) q: z.infer<typeof RangeSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const now = new Date();
      const today = startOfDayInZone(now, store.timezone);
      const monthStart = startOfDayInZone(new Date(now.getFullYear(), now.getMonth(), 1, 12), store.timezone);
      const from = q.from ?? new Date(today.getTime() - 29 * 86400_000);
      const to = q.to ?? now;
      const sid = store.id;
      const sales = { storeId: sid, status: 'ISSUED' as const, docType: { in: [...SALE_TYPES] } };

      const [todaySales, monthSales, purchases, receivables, payables, customers, newLeads, activeRepairs, pendingBookings, products, warrantyExpiring, recent, gp] = await Promise.all([
        tx.invoice.aggregate({ where: { ...sales, issuedAt: { gte: today } }, _sum: { grandTotal: true }, _count: true }),
        tx.invoice.aggregate({ where: { ...sales, issuedAt: { gte: monthStart } }, _sum: { grandTotal: true, taxableTotal: true } }),
        tx.purchaseOrder.aggregate({ where: { storeId: sid, status: 'RECEIVED', receivedAt: { gte: from, lte: to } }, _sum: { total: true } }),
        tx.$queryRaw<{ v: Prisma.Decimal | null }[]>`SELECT SUM("grandTotal" - "amountPaid") AS v FROM invoices WHERE "storeId" = ${sid}::uuid AND status = 'ISSUED' AND "docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY')`,
        tx.purchaseOrder.aggregate({ where: { storeId: sid, status: 'RECEIVED' }, _sum: { total: true } }), // supplier payments not yet modelled: treat received POs as payable
        tx.customer.count({ where: { storeId: sid, deletedAt: null } }),
        tx.lead.count({ where: { storeId: sid, status: 'NEW' } }),
        tx.repairJob.count({ where: { storeId: sid, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
        tx.booking.count({ where: { storeId: sid, status: { in: ['NEW', 'PENDING_CONFIRMATION'] } } }),
        tx.product.findMany({ where: { storeId: sid, deletedAt: null }, select: { id: true, name: true, sku: true, stockOnHand: true, reorderLevel: true } }),
        tx.productSerial.count({ where: { storeId: sid, status: 'SOLD', warrantyEnd: { gte: now, lte: new Date(now.getTime() + 30 * 86400_000) } } }),
        tx.invoice.findMany({ where: { storeId: sid }, orderBy: { issuedAt: 'desc' }, take: 8, select: { id: true, invoiceNumber: true, docType: true, issuedAt: true, grandTotal: true, paymentStatus: true, customerSnapshot: true } }),
        this.grossProfit(tx, sid, from, to),
      ]);
      const lowStock = products.filter((p) => p.stockOnHand <= p.reorderLevel);
      return {
        range: { from, to },
        todaySales: { amount: D(todaySales._sum.grandTotal), count: todaySales._count },
        monthlyRevenue: D(monthSales._sum.grandTotal),
        totalPurchases: D(purchases._sum.total),
        grossProfit: gp.grossProfit,
        receivables: D(receivables[0]?.v),
        payables: D(payables._sum.total),
        customers,
        newLeads,
        activeRepairJobs: activeRepairs,
        pendingBookings,
        lowStock: { count: lowStock.length, items: lowStock.slice(0, 10) },
        warrantyExpiringIn30Days: warrantyExpiring,
        recentTransactions: recent,
        chart: await this.dailySeries(tx, sid, from, to, store.timezone),
      };
    });
  }

  @Get('reports/sales')
  @StorePermission('reports.view')
  sales(@CurrentStore() store: StoreContext, @ZQuery(RangeSchema) q: z.infer<typeof RangeSchema>) {
    const { from, to } = this.range(q);
    return this.tenantDb.run(store.id, async (tx) => {
      const byProduct = await tx.$queryRaw<{ name: string; qty: Prisma.Decimal; revenue: Prisma.Decimal }[]>`
        SELECT ii.description AS name, SUM(ii.quantity) AS qty, SUM(ii."taxableValue") AS revenue
        FROM invoice_items ii JOIN invoices i ON i.id = ii."invoiceId"
        WHERE i."storeId" = ${store.id}::uuid AND i.status = 'ISSUED' AND i."docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY') AND i."issuedAt" BETWEEN ${from} AND ${to}
        GROUP BY ii.description ORDER BY revenue DESC LIMIT 50`;
      const byCategory = await tx.$queryRaw<{ category: string | null; revenue: Prisma.Decimal }[]>`
        SELECT COALESCE(pc.name, CASE WHEN ii."serviceId" IS NOT NULL THEN 'Services' ELSE 'Uncategorised' END) AS category, SUM(ii."taxableValue") AS revenue
        FROM invoice_items ii JOIN invoices i ON i.id = ii."invoiceId"
        LEFT JOIN products p ON p.id = ii."productId" LEFT JOIN product_categories pc ON pc.id = p."categoryId"
        WHERE i."storeId" = ${store.id}::uuid AND i.status = 'ISSUED' AND i."docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY') AND i."issuedAt" BETWEEN ${from} AND ${to}
        GROUP BY 1 ORDER BY revenue DESC`;
      const byEmployee = await tx.$queryRaw<{ userId: string | null; revenue: Prisma.Decimal; count: bigint }[]>`
        SELECT "createdById" AS "userId", SUM("taxableTotal") AS revenue, COUNT(*) AS count FROM invoices
        WHERE "storeId" = ${store.id}::uuid AND status = 'ISSUED' AND "docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY') AND "issuedAt" BETWEEN ${from} AND ${to}
        GROUP BY 1`;
      return {
        range: { from, to },
        byProduct: byProduct.map((r) => ({ name: r.name, quantity: D(r.qty), revenue: D(r.revenue) })),
        byCategory: byCategory.map((r) => ({ category: r.category, revenue: D(r.revenue) })),
        byEmployee: byEmployee.map((r) => ({ userId: r.userId, revenue: D(r.revenue), invoices: Number(r.count) })),
        daily: await this.dailySeries(tx, store.id, from, to, store.timezone),
      };
    });
  }

  @Get('reports/inventory')
  @StorePermission('reports.view')
  inventory(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, async (tx) => {
      const products = await tx.product.findMany({ where: { storeId: store.id, deletedAt: null }, select: { id: true, name: true, sku: true, stockOnHand: true, reorderLevel: true, purchasePrice: true } });
      const since = new Date(Date.now() - 90 * 86400_000);
      const sold = await tx.stockMovement.groupBy({ by: ['productId'], where: { storeId: store.id, movementType: 'SALE', createdAt: { gte: since } }, _sum: { quantity: true } });
      const soldIds = new Set(sold.map((s) => s.productId));
      return {
        valuationAtCost: products.reduce((a, p) => a + D(p.purchasePrice) * p.stockOnHand, 0),
        lowStock: products.filter((p) => p.stockOnHand <= p.reorderLevel),
        deadStock: products.filter((p) => p.stockOnHand > 0 && !soldIds.has(p.id)),
        items: products.map((p) => ({ ...p, value: D(p.purchasePrice) * p.stockOnHand })),
      };
    });
  }

  @Get('reports/profit-loss')
  @StorePermission('reports.view')
  profitLoss(@CurrentStore() store: StoreContext, @ZQuery(RangeSchema) q: z.infer<typeof RangeSchema>) {
    const { from, to } = this.range(q);
    return this.tenantDb.run(store.id, async (tx) => {
      const gp = await this.grossProfit(tx, store.id, from, to);
      const repairParts = await tx.$queryRaw<{ v: Prisma.Decimal | null }[]>`
        SELECT SUM(-sm.quantity * COALESCE(sm."unitCost", 0)) AS v FROM stock_movements sm
        WHERE sm."storeId" = ${store.id}::uuid AND sm."movementType" = 'REPAIR_CONSUMPTION' AND sm."createdAt" BETWEEN ${from} AND ${to}`;
      return {
        range: { from, to },
        revenue: gp.revenue,
        costOfGoodsSold: gp.cogs,
        repairPartsConsumed: D(repairParts[0]?.v),
        grossProfit: gp.grossProfit - D(repairParts[0]?.v),
        note: 'Operational P&L. Expenses and double-entry ledgers are not yet included.',
      };
    });
  }

  @Get('reports/gst')
  @StorePermission('reports.view')
  gst(@CurrentStore() store: StoreContext, @ZQuery(RangeSchema) q: z.infer<typeof RangeSchema>) {
    const { from, to } = this.range(q);
    return this.tenantDb.run(store.id, async (tx) => {
      const rows = await tx.$queryRaw<{ rate: Prisma.Decimal; hsn: string; taxable: Prisma.Decimal; cgst: Prisma.Decimal; sgst: Prisma.Decimal; igst: Prisma.Decimal }[]>`
        SELECT ii."gstRate" AS rate, ii."hsnSac" AS hsn, SUM(ii."taxableValue") AS taxable, SUM(ii.cgst) AS cgst, SUM(ii.sgst) AS sgst, SUM(ii.igst) AS igst
        FROM invoice_items ii JOIN invoices i ON i.id = ii."invoiceId"
        WHERE i."storeId" = ${store.id}::uuid AND i.status = 'ISSUED' AND i."docType" = 'TAX_INVOICE' AND i."issuedAt" BETWEEN ${from} AND ${to}
        GROUP BY 1, 2 ORDER BY 1, 2`;
      const lines = rows.map((r) => ({ rate: D(r.rate), hsnSac: r.hsn, taxable: D(r.taxable), cgst: D(r.cgst), sgst: D(r.sgst), igst: D(r.igst) }));
      const sum = (k: 'taxable' | 'cgst' | 'sgst' | 'igst') => Math.round(lines.reduce((a, l) => a + l[k], 0) * 100) / 100;
      return { range: { from, to }, lines, totals: { taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst') }, disclaimer: 'Summary for review only — verify with your tax professional before filing.' };
    });
  }

  private range(q: z.infer<typeof RangeSchema>) {
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 30 * 86400_000);
    return { from, to };
  }

  private async grossProfit(tx: Tx, storeId: string, from: Date, to: Date) {
    const rows = await tx.$queryRaw<{ revenue: Prisma.Decimal | null; cogs: Prisma.Decimal | null }[]>`
      SELECT SUM(ii."taxableValue") AS revenue, SUM(ii.quantity * ii."unitCost") AS cogs
      FROM invoice_items ii JOIN invoices i ON i.id = ii."invoiceId"
      WHERE i."storeId" = ${storeId}::uuid AND i.status = 'ISSUED' AND i."docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY') AND i."issuedAt" BETWEEN ${from} AND ${to}`;
    const revenue = D(rows[0]?.revenue);
    const cogs = D(rows[0]?.cogs);
    return { revenue, cogs, grossProfit: Math.round((revenue - cogs) * 100) / 100 };
  }

  private async dailySeries(tx: Tx, storeId: string, from: Date, to: Date, timeZone: string) {
    const rows = await tx.$queryRaw<{ day: string; sales: Prisma.Decimal; profit: Prisma.Decimal }[]>`
      SELECT to_char(i."issuedAt" AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
             SUM(ii."lineTotal") AS sales, SUM(ii."taxableValue" - ii.quantity * ii."unitCost") AS profit
      FROM invoices i JOIN invoice_items ii ON ii."invoiceId" = i.id
      WHERE i."storeId" = ${storeId}::uuid AND i.status = 'ISSUED' AND i."docType" IN ('TAX_INVOICE','BILL_OF_SUPPLY') AND i."issuedAt" BETWEEN ${from} AND ${to}
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({ day: r.day, sales: D(r.sales), profit: D(r.profit) }));
  }
}
