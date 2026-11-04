import { Module } from '@nestjs/common';
import { PublicStoreController } from './public-store.controller';

@Module({ controllers: [PublicStoreController] })
export class PublicStoreModule {}
