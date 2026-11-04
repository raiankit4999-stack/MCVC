import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type Tx = Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Entry point for all tenant-owned data access.
 *
 * `run(storeId, fn)` opens a transaction and sets the transaction-local
 * `app.store_id` setting that the PostgreSQL RLS policies check. Queries in
 * `fn` must still filter by storeId explicitly — RLS is the second layer.
 *
 * The storeId passed here must come from a verified source: the StoreContext
 * guard (authenticated membership) or the HostResolver (verified domain).
 */
@Injectable()
export class TenantDb {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(storeId: string, fn: (tx: Tx) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T> {
    if (!UUID_RE.test(storeId)) {
      throw new Error('TenantDb.run requires a valid store id');
    }
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.store_id', ${storeId}, true)`;
        return fn(tx);
      },
      { timeout: 15000, ...options },
    );
  }

  /** Cross-tenant access for platform jobs and network analytics. Use sparingly. */
  platform<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return fn(tx);
      },
      { timeout: 15000 },
    );
  }
}
