import { Global, Module } from '@nestjs/common';
import { HostResolver } from './host-resolver.service';
import { StoreContextGuard } from './store-context.guard';

@Global()
@Module({ providers: [HostResolver, StoreContextGuard], exports: [HostResolver, StoreContextGuard] })
export class TenancyModule {}
