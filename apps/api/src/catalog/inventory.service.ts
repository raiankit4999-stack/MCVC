import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import type { Tx } from '../common/tenant-db.service';

export interface MovementInput {
  storeId: string;
  productId: string;
  quantity: number; // signed
  type: MovementType;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  unitCost?: Prisma.Decimal | number;
  userId?: string;
}

/** All stock changes go through here: product.stockOnHand + an append-only movement row, atomically. */
@Injectable()
export class InventoryService {
  async move(tx: Tx, m: MovementInput) {
    if (!Number.isInteger(m.quantity) || m.quantity === 0) throw new ConflictException('Quantity must be a non-zero whole number');
    const where: Prisma.ProductWhereInput = { id: m.productId, storeId: m.storeId, deletedAt: null };
    const { count } = await tx.product.updateMany({
      where: m.quantity < 0 ? { ...where, stockOnHand: { gte: -m.quantity } } : where,
      data: { stockOnHand: { increment: m.quantity } },
    });
    if (count === 0) {
      const exists = await tx.product.findFirst({ where, select: { name: true, stockOnHand: true } });
      if (!exists) throw new NotFoundException('Product not found');
      throw new ConflictException(`Insufficient stock for ${exists.name} (available ${exists.stockOnHand})`);
    }
    return tx.stockMovement.create({
      data: {
        storeId: m.storeId,
        productId: m.productId,
        movementType: m.type,
        quantity: m.quantity,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        note: m.note,
        unitCost: m.unitCost,
        createdById: m.userId,
      },
    });
  }

  /** Adds new serial numbers in stock. Fails on duplicates within the store. */
  async addSerials(tx: Tx, storeId: string, productId: string, serials: { serialNumber: string; imei?: string }[]) {
    if (!serials.length) return;
    const unique = new Set(serials.map((s) => s.serialNumber));
    if (unique.size !== serials.length) throw new ConflictException('Duplicate serial numbers in request');
    const existing = await tx.productSerial.findMany({ where: { storeId, serialNumber: { in: [...unique] } }, select: { serialNumber: true } });
    if (existing.length) throw new ConflictException(`Serial already exists: ${existing.map((e) => e.serialNumber).join(', ')}`);
    await tx.productSerial.createMany({ data: serials.map((s) => ({ storeId, productId, serialNumber: s.serialNumber, imei: s.imei })) });
  }
}
