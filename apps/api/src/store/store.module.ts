import { Module } from '@nestjs/common';
import { DNS_RESOLVER, systemDnsResolver } from '../domains/dns';
import { DomainTlsController, DomainsController } from './domains.controller';
import { StoreController } from './store.controller';

@Module({
  controllers: [StoreController, DomainsController, DomainTlsController],
  providers: [{ provide: DNS_RESOLVER, useValue: systemDnsResolver }],
})
export class StoreModule {}
