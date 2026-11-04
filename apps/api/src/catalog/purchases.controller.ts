import { BadRequestException, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, CurrentUser, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { SequenceService } from '../common/sequence.service';
import { TenantDb } from '../common/tenant-db.service';
import { gstin, indianPhone, money, uuid } from '../common/validators';
import { ApiZodBody, ZBody } from '../common/zod';
import { InventoryService } from './inventory.service';

const SupplierSchema = z.object({ name: z.string().trim().min(2).max(150), gstin: gstin.optional(), phone: indianPhone.optional(), email: z.email().optional(), address: z.string().max(300).optional() });
const PurchaseSchema = z.object({
  supplierId: uuid,
  supplierInvoiceNo: z.string().max(60).optional(),
  items: z.array(z.object({ productId: uuid, quantity: z.number().int().positive(), unitCost: money, gstRate: z.number().min(0).max(100), serials: z.array(z.string().trim().min(3).max(60)).default([]) })).min(1).max(200),
  receiveNow: z.boolean().default(false),
});

@ApiTags('purchases')
@Controller()
export class PurchasesController {
  constructor(private readonly tenantDb: TenantDb, private readonly inventory: InventoryService, private readonly sequences: SequenceService) {}

  @Get('suppliers')
  @StorePermission('suppliers.read')
  suppliers(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, (tx) => tx.supplier.findMany({ where: { storeId: store.id, deletedAt: null }, orderBy: { name: 'asc' } }));
  }

  @Post('suppliers')
  @StorePermission('suppliers.write')
  @ApiZodBody(SupplierSchema)
  createSupplier(@CurrentStore() store: StoreContext, @ZBody(SupplierSchema) body: z.infer<typeof SupplierSchema>) {
    return this.tenantDb.run(store.id, (tx) => tx.supplier.create({ data: { ...body, storeId: store.id } }));
  }

  @Get('purchases')
  @StorePermission('suppliers.read')
  purchases(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, (tx) =>
      tx.purchaseOrder.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { supplier: { select: { name: true } }, items: true } }),
    );
  }

  @Post('purchases')
  @StorePermission('suppliers.write')
  @ApiZodBody(PurchaseSchema)
  createPurchase(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(PurchaseSchema) body: z.infer<typeof PurchaseSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: body.supplierId, storeId: store.id, deletedAt: null } });
      if (!supplier) throw new NotFoundException('Supplier not found');
      const productIds = [...new Set(body.items.map((i) => i.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds }, storeId: store.id, deletedAt: null } });
      if (products.length !== productIds.length) throw new NotFoundException('Product not found');
      const { number } = await this.sequences.next(tx, store.id, 'PURCHASE_ORDER', 'PO', store.timezone);
      const total = body.items.reduce((acc, i) => acc.add(new Prisma.Decimal(i.unitCost).mul(i.quantity).mul(1 + i.gstRate / 100)), new Prisma.Decimal(0));
      const po = await tx.purchaseOrder.create({
        data: {
          storeId: store.id,
          supplierId: supplier.id,
          number,
          supplierInvoiceNo: body.supplierInvoiceNo,
          status: 'ORDERED',
          total: total.toDecimalPlaces(2),
          items: { create: body.items.map((i) => ({ ...i, storeId: store.id })) },
        },
      });
      if (body.receiveNow) await this.receiveInTx(tx, store, user, po.id);
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id }, include: { items: true } });
    });
  }

  @Post('purchases/:id/receive')
  @HttpCode(200)
  @StorePermission('inventory.adjust')
  receive(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, async (tx) => {
      await this.receiveInTx(tx, store, user, id);
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
    });
  }

  /** Goods receipt: stock in each line at cost, register serial numbers, update cost history. */
  private async receiveInTx(tx: Prisma.TransactionClient, store: StoreContext, user: AuthUser, id: string) {
    const locked = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM purchase_orders WHERE id = ${id}::uuid AND "storeId" = ${store.id}::uuid FOR UPDATE`;
    if (!locked.length) throw new NotFoundException('Purchase not found');
    if (locked[0].status !== 'ORDERED') throw new ConflictException(`Purchase is ${locked[0].status.toLowerCase()}`);
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
    for (const item of po.items) {
      const product = await tx.product.findFirstOrThrow({ where: { id: item.productId, storeId: store.id } });
      if (product.isSerialized) {
        if (item.serials.length !== item.quantity) throw new BadRequestException(`${product.name}: provide ${item.quantity} serial numbers`);
        await this.inventory.addSerials(tx, store.id, product.id, item.serials.map((serialNumber) => ({ serialNumber })));
      }
      await this.inventory.move(tx, { storeId: store.id, productId: product.id, quantity: item.quantity, type: 'PURCHASE', referenceType: 'purchase', referenceId: po.id, unitCost: item.unitCost, userId: user.id });
      await tx.product.update({ where: { id: product.id }, data: { purchasePrice: item.unitCost } });
    }
    await tx.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
  }
}
