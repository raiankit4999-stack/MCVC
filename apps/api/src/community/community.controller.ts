import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../auth/decorators';
import { ZQuery } from '../common/zod';
import { CommunityService } from './community.service';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
const DirectorySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().max(80).optional(),
  area: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  association: z.string().max(80).optional(),
  product: z.string().trim().min(2).max(80).optional(),
  service: z.string().trim().min(2).max(80).optional(),
  verified: bool.optional(),
  openNow: bool.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

@ApiTags('community')
@Public()
@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('community')
  profile() {
    return this.community.publicProfile();
  }

  @Get('cities')
  cities() {
    return this.community.cities();
  }

  @Get('areas')
  areas(@ZQuery(z.object({ city: z.string().max(80).optional() })) q: { city?: string }) {
    return this.community.areas(q.city);
  }

  @Get('categories')
  categories() {
    return this.community.categories();
  }

  @Get('membership/plans')
  plans() {
    return this.community.plans();
  }

  @Get('community/network')
  network() {
    return this.community.network();
  }

  @Get('service-centres')
  serviceCentres(@ZQuery(z.object({ brand: z.string().max(40).optional(), city: z.string().max(80).optional(), status: z.enum(['AUTHORISED', 'THIRD_PARTY', 'UNAUTHORISED']).optional() })) q: { brand?: string; city?: string; status?: 'AUTHORISED' | 'THIRD_PARTY' | 'UNAUTHORISED' }) {
    return this.community.serviceCentres(q);
  }

  @Get('associations')
  associations(@ZQuery(z.object({ zone: z.string().max(40).optional() })) q: { zone?: string }) {
    return this.community.associations(q.zone);
  }

  @Get('associations/:slug')
  association(@Param('slug') slug: string) {
    return this.community.association(slug);
  }

  @Get('stores')
  stores(@ZQuery(DirectorySchema) q: z.infer<typeof DirectorySchema>) {
    return this.community.directory(q);
  }

  @Get('stores-featured')
  featured() {
    return this.community.featured();
  }

  @Get('stores/:slug')
  store(@Param('slug') slug: string) {
    return this.community.storeProfile(slug);
  }
}
