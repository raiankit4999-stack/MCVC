import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BookingsModule } from './bookings/bookings.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommonModule } from './common/common.module';
import { CommunityModule } from './community/community.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { MasterModule } from './master/master.module';
import { MembershipModule } from './membership/membership.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicStoreModule } from './public-store/public-store.module';
import { RepairsModule } from './repairs/repairs.module';
import { StoreModule } from './store/store.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 300) }],
      // Only for automated test runs; never set in deployed environments.
      skipIf: () => process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production',
    }),
    CommonModule,
    TenancyModule,
    NotificationsModule,
    AuthModule,
    CommunityModule,
    MembershipModule,
    MasterModule,
    StoreModule,
    CustomersModule,
    CatalogModule,
    BookingsModule,
    RepairsModule,
    BillingModule,
    DashboardModule,
    PublicStoreModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
