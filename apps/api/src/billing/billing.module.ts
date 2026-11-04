import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { InvoicesService } from './invoices.service';

@Module({ controllers: [BillingController], providers: [InvoicesService], exports: [InvoicesService] })
export class BillingModule {}
