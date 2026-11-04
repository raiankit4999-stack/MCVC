import { Global, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { InventoryService } from './inventory.service';
import { PurchasesController } from './purchases.controller';

@Global()
@Module({ controllers: [CatalogController, PurchasesController], providers: [InventoryService], exports: [InventoryService] })
export class CatalogModule {}
