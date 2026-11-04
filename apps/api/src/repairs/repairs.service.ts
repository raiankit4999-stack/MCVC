import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RepairApproval, RepairStatus } from '@prisma/client';
import type { StoreContext } from '../auth/types';
import { InventoryService } from '../catalog/inventory.service';
import { randomToken, sha256 } from '../common/crypto';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import type { Tx } from '../common/tenant-db.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { REPAIR_STATUS_LABEL, canTransition } from './repair-status';

export interface IntakeInput {
  customerId?: string;
  customer?: { name: string; phone: string; email?: string };
  device: { category: string; brand: string; model: string; serialNumber?: string; imei?: string };
  reportedProblem: string;
  physicalCondition?: string;
  accessories: string[];
  intakePhotos: string[];
  technicianId?: string;
  estimatedDelivery?: Date;
  estimateAmount?: number;
  warrantyDays?: number;
  bookingId?: string;
}

const PUBLIC_JOB_SELECT = {
  jobNumber: true,
  status: true,
  reportedProblem: true,
  diagnosis: true,
  estimateAmount: true,
  finalAmount: true,
  approval: true,
  estimatedDelivery: true,
  deliveredAt: true,
  createdAt: true,
  device: { select: { category: true, brand: true, model: true } },
  technician: { select: { name: true } },
  updates: { where: { isPublic: true }, orderBy: { createdAt: 'asc' as const }, select: { status: true, note: true, createdAt: true } },
} satisfies Prisma.RepairJobSelect;

@Injectable()
export class RepairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
    private readonly notifications: NotificationsService,
  ) {}

  async intake(tx: Tx, store: Pick<StoreContext, 'id' | 'timezone' | 'slug'>, input: IntakeInput, userId?: string) {
    let customerId = input.customerId;
    if (customerId) {
      const c = await tx.customer.findFirst({ where: { id: customerId, storeId: store.id, deletedAt: null } });
      if (!c) throw new NotFoundException('Customer not found');
    } else if (input.customer) {
      customerId = (await this.customers.findOrCreate(tx, store.id, input.customer)).id;
    } else {
      throw new BadRequestException('Provide customerId or customer details');
    }
    if (input.technicianId) {
      const tech = await tx.employee.findFirst({ where: { id: input.technicianId, storeId: store.id, isActive: true } });
      if (!tech) throw new BadRequestException('Technician not found');
    }

    const settings = await this.prisma.storeSettings.findUniqueOrThrow({ where: { storeId: store.id }, select: { jobCardPrefix: true } });
    const { number } = await this.sequences.next(tx, store.id, 'JOB_CARD', settings.jobCardPrefix, store.timezone);
    const device = await tx.repairDevice.create({ data: { ...input.device, storeId: store.id, customerId } });
    const trackingToken = randomToken(24);
    const job = await tx.repairJob.create({
      data: {
        storeId: store.id,
        customerId,
        deviceId: device.id,
        technicianId: input.technicianId,
        jobNumber: number,
        reportedProblem: input.reportedProblem,
        physicalCondition: input.physicalCondition,
        accessories: input.accessories,
        intakePhotos: input.intakePhotos,
        estimateAmount: input.estimateAmount,
        estimatedDelivery: input.estimatedDelivery,
        warrantyDays: input.warrantyDays ?? 0,
        trackingTokenHash: sha256(trackingToken),
        createdById: userId,
        updates: { create: { storeId: store.id, status: 'RECEIVED', note: 'Device received at store', createdById: userId } },
      },
      include: { customer: true, device: true },
    });

    if (input.bookingId) {
      const { count } = await tx.booking.updateMany({ where: { id: input.bookingId, storeId: store.id }, data: { repairJobId: job.id, status: 'IN_PROGRESS' } });
      if (!count) throw new NotFoundException('Booking not found');
    }
    await this.notifyCustomer(tx, store.id, job.customer.phone, 'repair.received', { jobNumber: number, trackingToken, device: `${device.brand} ${device.model}` });
    return { ...job, trackingToken };
  }

  async changeStatus(tx: Tx, storeId: string, id: string, to: RepairStatus, opts: { note?: string; isPublic?: boolean; userId?: string; noCharge?: boolean }) {
    const job = await this.lock(tx, storeId, id);
    if (!canTransition(job.status, to)) throw new ConflictException(`Cannot move job from ${REPAIR_STATUS_LABEL[job.status]} to ${REPAIR_STATUS_LABEL[to]}`);
    if ((to === 'IN_PROGRESS' || to === 'WAITING_FOR_PARTS') && job.status === 'WAITING_FOR_APPROVAL' && job.approval !== 'APPROVED') {
      throw new ConflictException('Customer approval is required before starting the repair');
    }
    if (to === 'DELIVERED' && !opts.noCharge) {
      const paid = await tx.invoice.findFirst({ where: { storeId, repairJobId: id, status: 'ISSUED', paymentStatus: 'PAID', docType: { in: ['TAX_INVOICE', 'BILL_OF_SUPPLY'] } } });
      if (!paid) throw new ConflictException('Collect payment (fully paid invoice) before delivering, or mark as no-charge');
    }
    const updated = await tx.repairJob.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        updates: { create: { storeId, status: to, note: opts.note, isPublic: opts.isPublic ?? true, createdById: opts.userId } },
      },
      include: { customer: true, device: true },
    });
    if (to === 'READY' || to === 'DELIVERED' || to === 'WAITING_FOR_PARTS') {
      await this.notifyCustomer(tx, storeId, updated.customer.phone, `repair.${to.toLowerCase()}`, { jobNumber: updated.jobNumber, device: `${updated.device.brand} ${updated.device.model}` });
    }
    return updated;
  }

  async quote(tx: Tx, storeId: string, id: string, input: { diagnosis: string; estimateAmount: number; labourCharge?: number; estimatedDelivery?: Date }, userId?: string) {
    const job = await this.lock(tx, storeId, id);
    if (!['DIAGNOSING', 'WAITING_FOR_APPROVAL'].includes(job.status)) throw new ConflictException('A quotation can only be shared during diagnosis');
    const updated = await tx.repairJob.update({
      where: { id },
      data: {
        diagnosis: input.diagnosis,
        estimateAmount: input.estimateAmount,
        labourCharge: input.labourCharge,
        estimatedDelivery: input.estimatedDelivery,
        status: 'WAITING_FOR_APPROVAL',
        approval: 'PENDING',
        approvalAt: null,
        updates: { create: { storeId, status: 'WAITING_FOR_APPROVAL', note: `Quotation shared: ₹${input.estimateAmount.toFixed(2)}`, createdById: userId } },
      },
      include: { customer: true },
    });
    await this.notifyCustomer(tx, storeId, updated.customer.phone, 'repair.quotation', { jobNumber: updated.jobNumber, amount: input.estimateAmount });
    return updated;
  }

  /** Records the customer's decision (from the tracking page, or by staff on the customer's behalf). */
  async decide(tx: Tx, storeId: string, id: string, decision: Extract<RepairApproval, 'APPROVED' | 'REJECTED'>, via: 'customer' | 'staff', userId?: string) {
    const job = await this.lock(tx, storeId, id);
    if (job.status !== 'WAITING_FOR_APPROVAL' || job.approval !== 'PENDING') throw new ConflictException('No quotation is awaiting approval');
    const nextStatus: RepairStatus = decision === 'APPROVED' ? 'IN_PROGRESS' : 'WAITING_FOR_APPROVAL';
    return tx.repairJob.update({
      where: { id },
      data: {
        approval: decision,
        approvalAt: new Date(),
        status: nextStatus,
        updates: {
          create: {
            storeId,
            status: nextStatus,
            note: decision === 'APPROVED' ? `Quotation approved by ${via}` : `Quotation declined by ${via} — device will be returned`,
            createdById: userId,
          },
        },
      },
    });
  }

  async addPart(tx: Tx, storeId: string, id: string, input: { productId: string; quantity: number; unitPrice?: number }, userId?: string) {
    const job = await this.lock(tx, storeId, id);
    if (['DELIVERED', 'CANCELLED'].includes(job.status)) throw new ConflictException('Job is closed');
    const product = await tx.product.findFirst({ where: { id: input.productId, storeId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.isSerialized) throw new BadRequestException('Serialized items must be billed on an invoice');
    await this.inventory.move(tx, { storeId, productId: product.id, quantity: -input.quantity, type: 'REPAIR_CONSUMPTION', referenceType: 'repair_job', referenceId: id, unitCost: product.purchasePrice, userId });
    return tx.jobPart.create({ data: { storeId, repairJobId: id, productId: product.id, quantity: input.quantity, unitPrice: input.unitPrice ?? product.sellingPrice } });
  }

  async regenerateTrackingToken(tx: Tx, storeId: string, id: string) {
    await this.lock(tx, storeId, id);
    const token = randomToken(24);
    await tx.repairJob.update({ where: { id }, data: { trackingTokenHash: sha256(token) } });
    return token;
  }

  /** Public view by tracking token. Only public timeline entries and non-sensitive fields are returned. */
  async publicView(tx: Tx, storeId: string, token: string) {
    const job = await tx.repairJob.findFirst({ where: { storeId, trackingTokenHash: sha256(token) }, select: { id: true, ...PUBLIC_JOB_SELECT } });
    if (!job) throw new NotFoundException('Tracking link is invalid or expired');
    const { id, ...rest } = job;
    const invoice = await tx.invoice.findFirst({
      where: { storeId, repairJobId: id, status: 'ISSUED', docType: { in: ['TAX_INVOICE', 'BILL_OF_SUPPLY'] } },
      select: { invoiceNumber: true, grandTotal: true, amountPaid: true, paymentStatus: true },
    });
    return { ...rest, statusLabel: REPAIR_STATUS_LABEL[rest.status], invoice, jobId: id };
  }

  private async lock(tx: Tx, storeId: string, id: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM repair_jobs WHERE id = ${id}::uuid AND "storeId" = ${storeId}::uuid FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Repair job not found');
    return tx.repairJob.findUniqueOrThrow({ where: { id } });
  }

  private notifyCustomer(tx: Tx, storeId: string, phone: string, template: string, payload: Prisma.InputJsonValue) {
    return this.notifications.enqueue(storeId, { channel: 'WHATSAPP', recipient: phone, template, payload }, tx);
  }
}
