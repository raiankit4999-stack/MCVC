import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentStore, StorePermission } from '../auth/decorators';
import type { StoreContext } from '../auth/types';
import { TenantDb } from '../common/tenant-db.service';
import { indianPhone, uuid } from '../common/validators';
import { ApiZodBody, ZBody, ZQuery } from '../common/zod';
import { BookingsService } from './bookings.service';

const STATUSES = ['NEW', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
const CreateSchema = z.object({
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: indianPhone, email: z.email().optional() }),
  serviceId: uuid.optional(),
  technicianId: uuid.optional(),
  slotStart: z.coerce.date(),
  deviceType: z.string().max(60).optional(),
  deviceModel: z.string().max(120).optional(),
  problem: z.string().max(2000).optional(),
  pickupRequired: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
const UpdateSchema = z.object({ status: z.enum(STATUSES).optional(), slotStart: z.coerce.date().optional(), technicianId: uuid.nullable().optional(), notes: z.string().max(2000).optional() });
const ListSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), status: z.enum(STATUSES).optional() });

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly tenantDb: TenantDb, private readonly bookings: BookingsService) {}

  @Get()
  @StorePermission('bookings.read')
  list(@CurrentStore() store: StoreContext, @ZQuery(ListSchema) q: z.infer<typeof ListSchema>) {
    return this.tenantDb.run(store.id, (tx) =>
      tx.booking.findMany({
        where: { storeId: store.id, ...(q.status ? { status: q.status } : {}), slotStart: { gte: q.from, lte: q.to } },
        orderBy: { slotStart: 'asc' },
        take: 500,
        include: { customer: { select: { name: true, phone: true } }, service: { select: { name: true } }, technician: { select: { name: true } } },
      }),
    );
  }

  @Get('availability')
  @StorePermission('bookings.read')
  availability(@CurrentStore() store: StoreContext, @ZQuery(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })) q: { date: string }) {
    return this.tenantDb.run(store.id, (tx) => this.bookings.availability(tx, store.id, store.timezone, q.date));
  }

  @Post()
  @StorePermission('bookings.write')
  @ApiZodBody(CreateSchema)
  create(@CurrentStore() store: StoreContext, @ZBody(CreateSchema) body: z.infer<typeof CreateSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.bookings.create(tx, store.id, store.timezone, { ...body, status: 'CONFIRMED' }));
  }

  @Get(':id')
  @StorePermission('bookings.read')
  get(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenantDb.run(store.id, async (tx) => {
      const b = await tx.booking.findFirst({ where: { id, storeId: store.id }, include: { customer: true, service: true, technician: true } });
      if (!b) throw new NotFoundException('Booking not found');
      return b;
    });
  }

  @Patch(':id')
  @StorePermission('bookings.write')
  @ApiZodBody(UpdateSchema)
  update(@CurrentStore() store: StoreContext, @Param('id', ParseUUIDPipe) id: string, @ZBody(UpdateSchema) body: z.infer<typeof UpdateSchema>) {
    return this.tenantDb.run(store.id, (tx) => this.bookings.update(tx, store.id, store.timezone, id, body));
  }
}
