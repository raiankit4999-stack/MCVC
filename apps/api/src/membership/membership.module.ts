import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { ProvisioningService } from './provisioning.service';

@Module({ controllers: [MembershipController], providers: [ProvisioningService], exports: [ProvisioningService] })
export class MembershipModule {}
