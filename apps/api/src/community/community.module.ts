import { Global, Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Global()
@Module({ controllers: [CommunityController], providers: [CommunityService], exports: [CommunityService] })
export class CommunityModule {}
