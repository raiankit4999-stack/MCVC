import { BadRequestException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CurrentStore, CurrentUser, StorePermission } from '../auth/decorators';
import type { AuthUser, StoreContext } from '../auth/types';
import { PrismaService } from '../common/prisma.service';
import { TenantDb, Tx } from '../common/tenant-db.service';
import { hsnSac, money, pagination, slugify, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { InventoryService } from './inventory.service';

const serial = z.object({ serialNumber: z.string().trim().min(3).max(60), imei: z.string().regex(/^\d{15}$/).optional() });
const ProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(60).optional(),
  modelNumber: z.string().trim().max(80).optional(),
  mpn: z.string().trim().max(80).optional(),
  categoryName: z.string().trim().max(60).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.url().optional(),
  hsnCode: hsnSac,
  gstRate: z.number().min(0).max(100),
  mrp: money,
  purchasePrice: money,
  sellingPrice: money,
  warrantyMonths: z.number().int().min(0).max(120).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  unit: z.string().max(10).default('NOS'),
  isSerialized: z.boolean().default(false),
  condition: z.enum(['NEW', 'REFURBISHED', 'USED', 'OPEN_BOX']).default('NEW'),
  specs: z
    .object({ processor: z.string(), ram: z.string(), storage: z.string(), graphics: z.string(), screenSize: z.string(), os: z.string(), warrantyType: z.string() })
    .partial()
    .default({}),
  isPublished: z.boolean().default(true),
  openingStock: z.number().int().min(0).default(0),
  serials: z.array(serial).max(500).default([]),
});
const ProductUpdateSchema = ProductSchema.omit({ openingStock: true, serials: true, isSerialized: true }).partial();
const ProductQuery = pagination.extend({ categoryId: uuid.optional(), lowStock: z.enum(['true', 'false']).optional() });
const AdjustSchema = z.object({
  productId: uuid,
  quantity: z.number().int().refine((n) => n !== 0, 'Quantity cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGED', 'OPENING']).default('ADJUSTMENT'),
  reason: z.string().trim().min(3).max(300),
  serials: z.array(serial).default([]),
  removeSerials: z.array(z.string()).default([]),
});
const ServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(3000).optional(),
  sacCode: hsnSac.default('998713'),
  gstRate: z.number().min(0).max(100).default(18),
  price: money,
  priceIsStarting: z.boolean().default(true),
  durationMinutes: z.number().int().min(5).max(1440).default(60),
  isBookable: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly tenantDb: TenantDb, private readonly inventory: InventoryService, private readonly prisma: PrismaService) {}

  // ───── Products ─────

  @Get('products')
  @StorePermission('products.read')
  products(@CurrentStore() store: StoreContext, @ZQuery(ProductQuery) q: z.infer<typeof ProductQuery>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const where: Prisma.ProductWhereInput = {
        storeId: store.id,
        deletedAt: null,
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
        ...(q.q
          ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { sku: { equals: q.q, mode: 'insensitive' } }, { barcode: q.q }, { brand: { contains: q.q, mode: 'insensitive' } }, { serials: { some: { serialNumber: q.q } } }] }
          : {}),
      };
      let items = await tx.product.findMany({ where, orderBy: { name: 'asc' }, include: { category: { select: { name: true } } }, skip: (q.page - 1) * q.pageSize, take: q.pageSize });
      if (q.lowStock === 'true') items = items.filter((p) => p.stockOnHand <= p.reorderLevel);
      return { total: await tx.product.count({ where }), items };
    });
  }

  @Post('products')
  @StorePermission('products.write')
  @ApiZodBody(ProductSchema)
  createProduct(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(ProductSchema) body: z.infer<typeof ProductSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      await this.assertGstRate(store.id, body.gstRate);
      if (body.isSerialized && body.openingStock && body.openingStock !== body.serials.length) {
        throw new BadRequestException('Serialized products need one serial number per unit of opening stock');
      }
      const { categoryName, openingStock, serials, ...data } = body;
      const categoryId = categoryName ? await this.categoryId(tx, store.id, categoryName) : undefined;
      const product = await tx.product
        .create({ data: { ...data, storeId: store.id, categoryId } })
        .catch((e) => {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('SKU already exists');
          throw e;
        });
      const qty = body.isSerialized ? serials.length : openingStock;
      if (body.isSerialized) await this.inventory.addSerials(tx, store.id, product.id, serials);
      if (qty > 0) {
        await this.inventory.move(tx, { storeId: store.id, productId: product.id, quantity: qty, type: 'OPENING', referenceType: 'product', referenceId: product.id, unitCost: body.purchasePrice, userId: user.id });
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id } });
    });
  }

  @Get('products/:id')
  @StorePermission('products.read')
  product(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, async (tx) => {
      const p = await tx.product.findFirst({
        where: { id, storeId: store.id, deletedAt: null },
        include: { category: true, serials: { orderBy: { createdAt: 'desc' }, take: 200 }, movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
      });
      if (!p) throw new NotFoundException('Product not found');
      return p;
    });
  }

  @Patch('products/:id')
  @StorePermission('products.write')
  updateProduct(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(ProductUpdateSchema) body: z.infer<typeof ProductUpdateSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      if (body.gstRate !== undefined) await this.assertGstRate(store.id, body.gstRate);
      const { categoryName, ...data } = body;
      const categoryId = categoryName ? await this.categoryId(tx, store.id, categoryName) : undefined;
      const { count } = await tx.product.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data: { ...data, ...(categoryId ? { categoryId } : {}) } });
      if (!count) throw new NotFoundException('Product not found');
      return tx.product.findUniqueOrThrow({ where: { id } });
    });
  }

  @Delete('products/:id')
  @HttpCode(204)
  @StorePermission('products.write')
  async deleteProduct(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    await this.tenantDb.run(store.id, async (tx) => {
      const { count } = await tx.product.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data: { deletedAt: new Date(), isPublished: false } });
      if (!count) throw new NotFoundException('Product not found');
    });
  }

  @Get('product-categories')
  @StorePermission('products.read')
  categories(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, (tx) => tx.productCategory.findMany({ where: { storeId: store.id }, orderBy: { name: 'asc' } }));
  }

  // ───── Inventory ─────

  @Get('inventory')
  @StorePermission('inventory.read')
  inventorySummary(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, async (tx) => {
      const products = await tx.product.findMany({
        where: { storeId: store.id, deletedAt: null },
        select: { id: true, name: true, sku: true, stockOnHand: true, reorderLevel: true, purchasePrice: true, sellingPrice: true, isSerialized: true },
        orderBy: { name: 'asc' },
      });
      const valuation = products.reduce((acc, p) => acc.add(p.purchasePrice.mul(p.stockOnHand)), new Prisma.Decimal(0));
      return {
        totals: { products: products.length, units: products.reduce((a, p) => a + p.stockOnHand, 0), valuationAtCost: valuation.toFixed(2), lowStock: products.filter((p) => p.stockOnHand <= p.reorderLevel).length },
        items: products,
      };
    });
  }

  @Get('inventory/movements')
  @StorePermission('inventory.read')
  movements(@CurrentStore() store: StoreContext, @ZQuery(pagination.extend({ productId: uuid.optional() })) q: { productId?: string; page: number; pageSize: number }) {
    return this.tenantDb.run(store.id, (tx) =>
      tx.stockMovement.findMany({
        where: { storeId: store.id, ...(q.productId ? { productId: q.productId } : {}) },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { product: { select: { name: true, sku: true } } },
      }),
    );
  }

  @Post('inventory/adjustments')
  @StorePermission('inventory.adjust')
  @ApiZodBody(AdjustSchema)
  adjust(@CurrentStore() store: StoreContext, @CurrentUser() user: AuthUser, @ZBody(AdjustSchema) body: z.infer<typeof AdjustSchema>) {
    return this.tenantDb.run(store.id, async (tx) => {
      const product = await tx.product.findFirst({ where: { id: body.productId, storeId: store.id, deletedAt: null } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.isSerialized) {
        if (body.quantity > 0 && body.serials.length !== body.quantity) throw new BadRequestException('Provide one serial per unit added');
        if (body.quantity < 0 && body.removeSerials.length !== -body.quantity) throw new BadRequestException('Provide the serial numbers being removed');
        if (body.quantity > 0) await this.inventory.addSerials(tx, store.id, product.id, body.serials);
        if (body.quantity < 0) {
          const { count } = await tx.productSerial.updateMany({
            where: { storeId: store.id, productId: product.id, serialNumber: { in: body.removeSerials }, status: 'IN_STOCK' },
            data: { status: body.type === 'DAMAGED' ? 'DAMAGED' : 'RETURNED' },
          });
          if (count !== body.removeSerials.length) throw new BadRequestException('One or more serials are not in stock');
        }
      }
      return this.inventory.move(tx, { storeId: store.id, productId: product.id, quantity: body.quantity, type: body.type, note: body.reason, referenceType: 'adjustment', userId: user.id });
    });
  }

  @Get('serials')
  @StorePermission('inventory.read')
  serials(@CurrentStore() store: StoreContext, @ZQuery(pagination.extend({ status: z.enum(['IN_STOCK', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED', 'RMA']).optional() })) q: { q?: string; status?: string; page: number; pageSize: number }) {
    return this.tenantDb.run(store.id, (tx) =>
      tx.productSerial.findMany({
        where: { storeId: store.id, ...(q.status ? { status: q.status as never } : {}), ...(q.q ? { OR: [{ serialNumber: { contains: q.q, mode: 'insensitive' } }, { imei: q.q }] } : {}) },
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    );
  }

  // ───── Services ─────

  @Get('services')
  @StorePermission('services.read')
  services(@CurrentStore() store: StoreContext) {
    return this.tenantDb.run(store.id, (tx) => tx.service.findMany({ where: { storeId: store.id, deletedAt: null }, orderBy: { name: 'asc' } }));
  }

  @Post('services')
  @StorePermission('services.write')
  @ApiZodBody(ServiceSchema)
  async createService(@CurrentStore() store: StoreContext, @ZBody(ServiceSchema) body: z.infer<typeof ServiceSchema>) {
    await this.assertGstRate(store.id, body.gstRate);
    return this.tenantDb.run(store.id, async (tx) => {
      let slug = slugify(body.name) || 'service';
      if (await tx.service.findFirst({ where: { storeId: store.id, slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      return tx.service.create({ data: { ...body, slug, storeId: store.id } });
    });
  }

  @Patch('services/:id')
  @StorePermission('services.write')
  updateService(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(ServiceSchema.partial()) body: Partial<z.infer<typeof ServiceSchema>>) {
    return this.tenantDb.run(store.id, async (tx) => {
      if (body.gstRate !== undefined) await this.assertGstRate(store.id, body.gstRate);
      const { count } = await tx.service.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data: body });
      if (!count) throw new NotFoundException('Service not found');
      return tx.service.findUniqueOrThrow({ where: { id } });
    });
  }

  @Delete('services/:id')
  @HttpCode(204)
  @StorePermission('services.write')
  async deleteService(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    await this.tenantDb.run(store.id, async (tx) => {
      const { count } = await tx.service.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data: { deletedAt: new Date(), isPublished: false } });
      if (!count) throw new NotFoundException('Service not found');
    });
  }

  private async categoryId(tx: Tx, storeId: string, name: string) {
    const c = await tx.productCategory.upsert({ where: { storeId_name: { storeId, name } }, create: { storeId, name }, update: {} });
    return c.id;
  }

  async assertGstRate(storeId: string, rate: number) {
    const settings = await this.prisma.storeSettings.findUnique({ where: { storeId }, select: { allowedGstRates: true } });
    const allowed = (settings?.allowedGstRates ?? []).map(Number);
    if (!allowed.includes(rate)) throw new BadRequestException(`GST rate ${rate}% is not enabled for this store (allowed: ${allowed.join(', ')})`);
  }
}
