import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { MasterController } from './master.controller';
import { ScopeService } from './scope.service';

@Module({ imports: [MembershipModule], controllers: [MasterController], providers: [ScopeService] })
export class MasterModule {}
