import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceType, PaymentMethod } from '@prisma/client';
import type { StoreContext } from '../auth/types';
import { InventoryService } from '../catalog/inventory.service';
import { fromPaise, toPaise } from '../common/money';
import { PrismaService } from '../common/prisma.service';
import { SequenceService } from '../common/sequence.service';
import type { Tx } from '../common/tenant-db.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { computeGst } from './gst';

export interface InvoiceLineInput {
  productId?: string;
  serviceId?: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  gstRate?: number;
  serialNumbers?: string[];
}

export interface InvoiceInput {
  docType: Extract<InvoiceType, 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'QUOTATION' | 'PROFORMA'>;
  customerId?: string;
  customer?: { name: string; phone: string; email?: string; gstin?: string; stateCode?: string };
  placeOfSupply?: string;
  pricesIncludeTax?: boolean;
  items: InvoiceLineInput[];
  payments?: { amount: number; method: PaymentMethod; reference?: string }[];
  repairJobId?: string;
  notes?: string;
  dueAt?: Date;
}

const PREFIX: Record<InvoiceInput['docType'], string | null> = { TAX_INVOICE: null, BILL_OF_SUPPLY: 'BOS', QUOTATION: 'QT', PROFORMA: 'PI' };
const AFFECTS_STOCK: InvoiceType[] = ['TAX_INVOICE', 'BILL_OF_SUPPLY'];

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly inventory: InventoryService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(tx: Tx, store: StoreContext, input: InvoiceInput, userId?: string) {
    const settings = await this.prisma.storeSettings.findUniqueOrThrow({ where: { storeId: store.id } });
    const storeRow = await this.prisma.store.findUniqueOrThrow({ where: { id: store.id }, select: { gstin: true, stateCode: true } });
    const allowedRates = settings.allowedGstRates.map(Number);
    const isTaxable = input.docType !== 'BILL_OF_SUPPLY';
    if (input.docType === 'TAX_INVOICE' && !storeRow.gstin) throw new BadRequestException('Add the store GSTIN before issuing tax invoices, or issue a bill of supply');

    // Customer
    let customer = null;
    if (input.customerId) {
      customer = await tx.customer.findFirst({ where: { id: input.customerId, storeId: store.id, deletedAt: null } });
      if (!customer) throw new NotFoundException('Customer not found');
    } else if (input.customer) {
      customer = await this.customers.findOrCreate(tx, store.id, input.customer);
      if (input.customer.gstin && !customer.gstin) customer = await tx.customer.update({ where: { id: customer.id }, data: { gstin: input.customer.gstin, stateCode: input.customer.gstin.slice(0, 2) } });
    }
    if (input.repairJobId) {
      const job = await tx.repairJob.findFirst({ where: { id: input.repairJobId, storeId: store.id } });
      if (!job) throw new NotFoundException('Repair job not found');
      if (customer && job.customerId !== customer.id) throw new BadRequestException('Invoice customer must match the repair job customer');
      if (!customer) customer = await tx.customer.findUniqueOrThrow({ where: { id: job.customerId } });
    }

    const placeOfSupply = input.placeOfSupply ?? customer?.gstin?.slice(0, 2) ?? customer?.stateCode ?? storeRow.stateCode;
    const interState = placeOfSupply !== storeRow.stateCode;

    // Resolve lines against the catalogue (prices, HSN and rates default from the master data).
    const lines = [];
    for (const raw of input.items) {
      if (!!raw.productId === !!raw.serviceId && !raw.description) throw new BadRequestException('Each line needs a product, a service or a description');
      let description = raw.description;
      let hsnSac = raw.hsnSac;
      let unitPrice = raw.unitPrice;
      let gstRate = raw.gstRate;
      let unitCost = 0;
      let product = null;
      if (raw.productId) {
        product = await tx.product.findFirst({ where: { id: raw.productId, storeId: store.id, deletedAt: null } });
        if (!product) throw new NotFoundException('Product not found');
        description ??= product.name;
        hsnSac ??= product.hsnCode;
        unitPrice ??= Number(product.sellingPrice);
        gstRate ??= Number(product.gstRate);
        unitCost = toPaise(product.purchasePrice);
        if (product.isSerialized) {
          if (!Number.isInteger(raw.quantity) || (raw.serialNumbers?.length ?? 0) !== raw.quantity) {
            throw new BadRequestException(`${product.name}: select ${raw.quantity} serial number(s)`);
          }
        }
      } else if (raw.serviceId) {
        const svc = await tx.service.findFirst({ where: { id: raw.serviceId, storeId: store.id, deletedAt: null } });
        if (!svc) throw new NotFoundException('Service not found');
        description ??= svc.name;
        hsnSac ??= svc.sacCode;
        unitPrice ??= Number(svc.price);
        gstRate ??= Number(svc.gstRate);
      }
      if (unitPrice === undefined) throw new BadRequestException(`Price required for "${description}"`);
      if (!hsnSac) throw new BadRequestException(`HSN/SAC required for "${description}"`);
      gstRate = isTaxable ? gstRate ?? 18 : 0;
      if (isTaxable && !allowedRates.includes(gstRate)) throw new BadRequestException(`GST rate ${gstRate}% is not enabled for this store`);
      lines.push({ raw, product, description: description!, hsnSac, unitPricePaise: toPaise(unitPrice), discountPaise: toPaise(raw.discount ?? 0), gstRate, unitCost });
    }

    const totals = computeGst(
      lines.map((l) => ({ quantity: l.raw.quantity, unitPricePaise: l.unitPricePaise, discountPaise: l.discountPaise, gstRate: l.gstRate })),
      { interState, pricesIncludeTax: input.pricesIncludeTax },
    );

    const prefix = PREFIX[input.docType] ?? settings.invoicePrefix;
    const { number, financialYear } = await this.sequences.next(tx, store.id, input.docType, prefix, store.timezone);

    const invoice = await tx.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer?.id,
        docType: input.docType,
        invoiceNumber: number,
        financialYear,
        placeOfSupply,
        isInterState: interState,
        customerSnapshot: customer ? { name: customer.name, phone: customer.phone, email: customer.email, gstin: customer.gstin, address: customer.address } : {},
        subtotal: fromPaise(totals.subtotalPaise),
        discountTotal: fromPaise(totals.discountPaise),
        taxableTotal: fromPaise(totals.taxablePaise),
        cgstTotal: fromPaise(totals.cgstPaise),
        sgstTotal: fromPaise(totals.sgstPaise),
        igstTotal: fromPaise(totals.igstPaise),
        roundOff: fromPaise(totals.roundOffPaise),
        grandTotal: fromPaise(totals.grandTotalPaise),
        repairJobId: input.repairJobId,
        notes: input.notes,
        dueAt: input.dueAt,
        createdById: userId,
        items: {
          create: lines.map((l, i) => {
            const t = totals.lines[i];
            return {
              storeId: store.id,
              productId: l.raw.productId,
              serviceId: l.raw.serviceId,
              description: l.description,
              hsnSac: l.hsnSac,
              quantity: l.raw.quantity,
              unitPrice: fromPaise(l.unitPricePaise),
              discount: fromPaise(t.discountPaise),
              taxableValue: fromPaise(t.taxablePaise),
              gstRate: l.gstRate,
              cgst: fromPaise(t.cgstPaise),
              sgst: fromPaise(t.sgstPaise),
              igst: fromPaise(t.igstPaise),
              lineTotal: fromPaise(t.totalPaise),
              unitCost: fromPaise(l.unitCost),
              serialNumbers: l.raw.serialNumbers ?? [],
            };
          }),
        },
      },
      include: { items: true },
    });

    // Stock and serial updates for supply documents.
    if (AFFECTS_STOCK.includes(input.docType)) {
      for (const [i, l] of lines.entries()) {
        if (!l.product) continue;
        const item = invoice.items[i];
        if (l.product.isSerialized) {
          const now = new Date();
          const warrantyEnd = l.product.warrantyMonths ? new Date(new Date(now).setMonth(now.getMonth() + l.product.warrantyMonths)) : null;
          const { count } = await tx.productSerial.updateMany({
            where: { storeId: store.id, productId: l.product.id, serialNumber: { in: l.raw.serialNumbers }, status: 'IN_STOCK' },
            data: { status: 'SOLD', invoiceItemId: item.id, warrantyStart: now, warrantyEnd },
          });
          if (count !== l.raw.quantity) throw new ConflictException(`${l.product.name}: one or more serial numbers are not in stock`);
        }
        if (!Number.isInteger(l.raw.quantity)) throw new BadRequestException(`${l.product.name}: stock items need whole quantities`);
        await this.inventory.move(tx, { storeId: store.id, productId: l.product.id, quantity: -l.raw.quantity, type: 'SALE', referenceType: 'invoice', referenceId: invoice.id, unitCost: l.product.purchasePrice, userId });
      }
    }

    for (const p of input.payments ?? []) {
      await this.recordPayment(tx, store.id, invoice.id, p, userId);
    }

    if (customer && AFFECTS_STOCK.includes(input.docType)) {
      await this.notifications.enqueue(store.id, { channel: 'WHATSAPP', recipient: customer.phone, template: 'invoice.issued', payload: { invoiceNumber: number, total: fromPaise(totals.grandTotalPaise).toFixed(2) } }, tx);
    }
    return this.get(tx, store.id, invoice.id);
  }

  async recordPayment(tx: Tx, storeId: string, invoiceId: string, p: { amount: number; method: PaymentMethod; reference?: string }, userId?: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid AND "storeId" = ${storeId}::uuid FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Invoice not found');
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.status !== 'ISSUED') throw new ConflictException('Invoice is not open for payment');
    if (!AFFECTS_STOCK.includes(inv.docType)) throw new BadRequestException('Payments can only be recorded against invoices');
    const amount = toPaise(p.amount);
    if (amount <= 0) throw new BadRequestException('Payment amount must be positive');
    const balance = toPaise(inv.grandTotal) - toPaise(inv.amountPaid);
    if (amount > balance) throw new BadRequestException(`Payment exceeds the outstanding balance of ₹${(balance / 100).toFixed(2)}`);
    const payment = await tx.payment.create({ data: { storeId, invoiceId, amount: fromPaise(amount), method: p.method, reference: p.reference, createdById: userId } });
    const paid = toPaise(inv.amountPaid) + amount;
    const total = toPaise(inv.grandTotal);
    await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: fromPaise(paid), paymentStatus: paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID' } });
    return payment;
  }

  /** Cancels an unpaid invoice by reversing its stock and serial effects. The document itself is kept. */
  async cancel(tx: Tx, storeId: string, id: string, reason: string, userId?: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM invoices WHERE id = ${id}::uuid AND "storeId" = ${storeId}::uuid FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Invoice not found');
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (inv.status === 'CANCELLED') throw new ConflictException('Invoice already cancelled');
    if (toPaise(inv.amountPaid) > 0) throw new ConflictException('Refund the payments (or issue a credit note) before cancelling');
    if (AFFECTS_STOCK.includes(inv.docType)) {
      for (const item of inv.items) {
        if (!item.productId) continue;
        await this.inventory.move(tx, { storeId, productId: item.productId, quantity: Number(item.quantity), type: 'REVERSAL', referenceType: 'invoice', referenceId: id, note: `Cancelled: ${reason}`, userId });
        if (item.serialNumbers.length) {
          await tx.productSerial.updateMany({ where: { storeId, invoiceItemId: item.id }, data: { status: 'IN_STOCK', invoiceItemId: null, warrantyStart: null, warrantyEnd: null } });
        }
      }
    }
    return tx.invoice.update({ where: { id }, data: { status: 'CANCELLED', notes: [inv.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n') } });
  }

  async get(tx: Tx, storeId: string, id: string) {
    const inv = await tx.invoice.findFirst({ where: { id, storeId }, include: { items: true, payments: { orderBy: { receivedAt: 'asc' } }, customer: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    const [store, settings] = await Promise.all([
      this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true, legalName: true, gstin: true, addressLine: true, phone: true, email: true, stateCode: true } }),
      this.prisma.storeSettings.findUnique({ where: { storeId }, select: { logoUrl: true, invoiceTerms: true } }),
    ]);
    // unitCost is internal (gross-profit reporting) and is not part of the customer-facing document.
    return { ...inv, items: inv.items.map(({ unitCost: _cost, ...i }) => i), seller: { ...store, logoUrl: settings?.logoUrl, terms: settings?.invoiceTerms }, balanceDue: inv.grandTotal.sub(inv.amountPaid).toFixed(2) };
  }
}

