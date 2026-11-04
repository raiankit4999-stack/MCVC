import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { TenantDb, Tx } from '../common/tenant-db.service';

export interface NotificationInput {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  payload?: Prisma.InputJsonValue;
}

/** Delivers a queued notification. Production drivers: WhatsApp Cloud API, SMS gateway, SMTP. */
export interface NotificationDriver {
  send(channel: NotificationChannel, recipient: string, template: string, payload: unknown): Promise<void>;
}

class LogDriver implements NotificationDriver {
  private readonly logger = new Logger('Notifications');
  async send(channel: NotificationChannel, recipient: string, template: string) {
    this.logger.log(`[${channel}] ${template} → ${recipient}`);
  }
}

/**
 * Transactional outbox: notifications are written in the same transaction as
 * the business change, and delivered asynchronously by `deliverPending`
 * (run from a worker / BullMQ repeatable job in production).
 */
@Injectable()
export class NotificationsService {
  private driver: NotificationDriver = new LogDriver();

  constructor(private readonly tenantDb: TenantDb) {}

  setDriver(driver: NotificationDriver) {
    this.driver = driver;
  }

  enqueue(storeId: string, n: NotificationInput, tx?: Tx) {
    const data = { storeId, channel: n.channel, recipient: n.recipient, template: n.template, payload: n.payload ?? {} };
    if (tx) return tx.notification.create({ data });
    return this.tenantDb.run(storeId, (t) => t.notification.create({ data }));
  }

  async deliverPending(limit = 50) {
    const batch = await this.tenantDb.platform((tx) =>
      tx.notification.findMany({ where: { status: 'QUEUED', attempts: { lt: 5 } }, orderBy: { createdAt: 'asc' }, take: limit }),
    );
    for (const n of batch) {
      try {
        await this.driver.send(n.channel, n.recipient, n.template, n.payload);
        await this.tenantDb.run(n.storeId, (tx) => tx.notification.update({ where: { id: n.id }, data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } } }));
      } catch (e) {
        await this.tenantDb.run(n.storeId, (tx) =>
          tx.notification.update({ where: { id: n.id }, data: { attempts: { increment: 1 }, lastError: String(e).slice(0, 500), status: n.attempts + 1 >= 5 ? 'FAILED' : 'QUEUED' } }),
        );
      }
    }
    return batch.length;
  }
}
