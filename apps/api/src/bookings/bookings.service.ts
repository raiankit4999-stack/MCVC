import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { shortRef } from '../common/crypto';
import { PrismaService } from '../common/prisma.service';
import type { Tx } from '../common/tenant-db.service';
import { startOfDayInZone } from '../common/time';
import { CustomersService } from '../customers/customers.service';

export interface BookingInput {
  customer: { name: string; phone: string; email?: string | null };
  serviceId?: string;
  technicianId?: string;
  slotStart: Date;
  deviceType?: string;
  deviceModel?: string;
  problem?: string;
  pickupRequired?: boolean;
  notes?: string;
  status?: BookingStatus;
}

const RELEASES_SLOT: BookingStatus[] = ['CANCELLED', 'NO_SHOW'];
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  NEW: ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED'],
  PENDING_CONFIRMATION: ['CONFIRMED', 'RESCHEDULED', 'CANCELLED'],
  CONFIRMED: ['RESCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
  RESCHEDULED: ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService, private readonly customers: CustomersService) {}

  async settings(storeId: string) {
    const s = await this.prisma.storeSettings.findUniqueOrThrow({ where: { storeId } });
    return { slotMinutes: s.bookingSlotMinutes, capacity: s.bookingSlotCapacity, hours: (s.businessHours as { day: number; open: string; close: string }[]) ?? [] };
  }

  /** Lists bookable slots for a calendar day (store-local) with remaining capacity. */
  async availability(tx: Tx, storeId: string, timeZone: string, date: string) {
    const { slotMinutes, capacity, hours } = await this.settings(storeId);
    const dayStart = startOfDayInZone(new Date(`${date}T12:00:00Z`), timeZone);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const windows = hours.filter((h) => h.day === weekday);
    const slots: Date[] = [];
    for (const w of windows) {
      const [oh, om] = w.open.split(':').map(Number);
      const [ch, cm] = w.close.split(':').map(Number);
      for (let m = oh * 60 + om; m + slotMinutes <= ch * 60 + cm; m += slotMinutes) slots.push(new Date(dayStart.getTime() + m * 60_000));
    }
    const existing = await tx.bookingSlot.findMany({ where: { storeId, startsAt: { in: slots } } });
    const now = Date.now();
    return slots.map((s) => {
      const row = existing.find((e) => e.startsAt.getTime() === s.getTime());
      const remaining = (row?.capacity ?? capacity) - (row?.booked ?? 0);
      return { startsAt: s.toISOString(), remaining: Math.max(0, remaining), available: remaining > 0 && s.getTime() > now };
    });
  }

  async create(tx: Tx, storeId: string, timeZone: string, input: BookingInput) {
    await this.assertBookableSlot(tx, storeId, timeZone, input.slotStart);
    if (input.serviceId) {
      const svc = await tx.service.findFirst({ where: { id: input.serviceId, storeId, deletedAt: null, isBookable: true } });
      if (!svc) throw new BadRequestException('Service is not available for booking');
    }
    if (input.technicianId) {
      const tech = await tx.employee.findFirst({ where: { id: input.technicianId, storeId, isActive: true, isTechnician: true } });
      if (!tech) throw new BadRequestException('Technician not found');
    }
    const customer = await this.customers.findOrCreate(tx, storeId, input.customer);
    await this.reserve(tx, storeId, input.slotStart);
    try {
      return await tx.booking.create({
        data: {
          storeId,
          customerId: customer.id,
          serviceId: input.serviceId,
          technicianId: input.technicianId,
          reference: shortRef('BK'),
          slotStart: input.slotStart,
          deviceType: input.deviceType,
          deviceModel: input.deviceModel,
          problem: input.problem,
          pickupRequired: input.pickupRequired ?? false,
          notes: input.notes,
          status: input.status ?? 'NEW',
        },
        include: { customer: true, service: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('The technician is already booked for this slot');
      throw e;
    }
  }

  async update(tx: Tx, storeId: string, timeZone: string, id: string, patch: { status?: BookingStatus; slotStart?: Date; technicianId?: string | null; notes?: string }) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM bookings WHERE id = ${id}::uuid AND "storeId" = ${storeId}::uuid FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Booking not found');
    const booking = await tx.booking.findUniqueOrThrow({ where: { id } });
    let status = patch.status ?? booking.status;

    if (patch.slotStart && patch.slotStart.getTime() !== booking.slotStart.getTime()) {
      if (RELEASES_SLOT.includes(booking.status) || booking.status === 'COMPLETED') throw new ConflictException('Cannot reschedule a closed booking');
      await this.assertBookableSlot(tx, storeId, timeZone, patch.slotStart);
      await this.reserve(tx, storeId, patch.slotStart);
      await this.release(tx, storeId, booking.slotStart);
      if (!patch.status) status = 'RESCHEDULED';
    }
    if (status !== booking.status) {
      if (!TRANSITIONS[booking.status].includes(status)) throw new ConflictException(`Cannot move booking from ${booking.status} to ${status}`);
      if (RELEASES_SLOT.includes(status)) await this.release(tx, storeId, patch.slotStart ?? booking.slotStart);
    }
    try {
      return await tx.booking.update({
        where: { id },
        data: { status, slotStart: patch.slotStart, technicianId: patch.technicianId, notes: patch.notes },
        include: { customer: true, service: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('The technician is already booked for this slot');
      throw e;
    }
  }

  /**
   * Atomically takes one unit of slot capacity. The conditional UPDATE locks the
   * slot row, so concurrent requests serialise and can never exceed capacity.
   */
  private async reserve(tx: Tx, storeId: string, startsAt: Date) {
    const { capacity } = await this.settings(storeId);
    await tx.$executeRaw`INSERT INTO booking_slots (id, "storeId", "startsAt", capacity, booked)
      VALUES (gen_random_uuid(), ${storeId}::uuid, ${startsAt}, ${capacity}, 0)
      ON CONFLICT ("storeId", "startsAt") DO NOTHING`;
    const updated = await tx.$executeRaw`UPDATE booking_slots SET booked = booked + 1
      WHERE "storeId" = ${storeId}::uuid AND "startsAt" = ${startsAt} AND booked < capacity`;
    if (updated === 0) throw new ConflictException('This time slot is fully booked — please choose another');
  }

  private async release(tx: Tx, storeId: string, startsAt: Date) {
    await tx.$executeRaw`UPDATE booking_slots SET booked = booked - 1 WHERE "storeId" = ${storeId}::uuid AND "startsAt" = ${startsAt} AND booked > 0`;
  }

  private async assertBookableSlot(tx: Tx, storeId: string, timeZone: string, slotStart: Date) {
    if (slotStart.getTime() <= Date.now()) throw new BadRequestException('Choose a future time slot');
    const local = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(slotStart);
    const slots = await this.availability(tx, storeId, timeZone, local);
    if (!slots.some((s) => new Date(s.startsAt).getTime() === slotStart.getTime())) {
      throw new BadRequestException('Selected time is outside business hours or not on the booking grid');
    }
  }
}
