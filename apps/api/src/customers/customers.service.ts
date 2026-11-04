import { Injectable } from '@nestjs/common';
import type { Tx } from '../common/tenant-db.service';

@Injectable()
export class CustomersService {
  /** Finds a customer by phone within the store, or creates one. Never matches across stores. */
  async findOrCreate(tx: Tx, storeId: string, input: { name: string; phone: string; email?: string | null }) {
    const existing = await tx.customer.findUnique({ where: { storeId_phone: { storeId, phone: input.phone } } });
    if (existing) {
      if (!existing.email && input.email) return tx.customer.update({ where: { id: existing.id }, data: { email: input.email } });
      return existing;
    }
    return tx.customer.create({ data: { storeId, name: input.name, phone: input.phone, email: input.email ?? undefined } });
  }
}
