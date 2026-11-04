import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from '../config';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { SequenceService } from './sequence.service';
import { TenantDb } from './tenant-db.service';

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }, PrismaService, TenantDb, AuditService, SequenceService],
  exports: [APP_CONFIG, PrismaService, TenantDb, AuditService, SequenceService],
})
export class CommonModule {}
