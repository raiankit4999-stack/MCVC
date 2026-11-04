import { Global, Module } from '@nestjs/common';
import { RepairsController } from './repairs.controller';
import { RepairsService } from './repairs.service';

@Global()
@Module({ controllers: [RepairsController], providers: [RepairsService], exports: [RepairsService] })
export class RepairsModule {}
