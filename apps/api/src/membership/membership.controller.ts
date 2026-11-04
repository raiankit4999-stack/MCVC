import { BadRequestException, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../common/prisma.service';
import { ApiZodBody, ZBody } from '../common/zod';
import { gstin, indianPhone, uuid } from '../common/validators';
import { CommunityService } from '../community/community.service';

export const ApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(100),
  phone: indianPhone,
  email: z.email(),
  gstin: gstin.optional(),
  addressLine: z.string().trim().min(5).max(300),
  cityId: uuid,
  areaId: uuid,
  categoryIds: z.array(uuid).min(1).max(15),
  planId: uuid,
  documents: z.array(z.object({ type: z.string().max(50), url: z.url() })).max(10).default([]),
});

@ApiTags('membership')
@ApiBearerAuth()
@Controller('membership')
export class MembershipController {
  constructor(private readonly prisma: PrismaService, private readonly community: CommunityService) {}

  @Post('applications')
  @ApiZodBody(ApplicationSchema)
  async apply(@CurrentUser() user: AuthUser, @ZBody(ApplicationSchema) body: z.infer<typeof ApplicationSchema>) {
    const c = await this.community.current();
    const pending = await this.prisma.membershipApplication.findFirst({ where: { applicantId: user.id, status: 'PENDING' } });
    if (pending) throw new ConflictException('You already have an application under review');

    const area = await this.prisma.area.findFirst({ where: { id: body.areaId, cityId: body.cityId, city: { communityId: c.id } } });
    if (!area) throw new BadRequestException('Area does not belong to the selected city');
    const [plan, cats] = await Promise.all([
      this.prisma.membershipPlan.findFirst({ where: { id: body.planId, communityId: c.id, isActive: true } }),
      this.prisma.businessCategory.count({ where: { id: { in: body.categoryIds }, communityId: c.id } }),
    ]);
    if (!plan) throw new BadRequestException('Unknown membership plan');
    if (cats !== new Set(body.categoryIds).size) throw new BadRequestException('Unknown business category');

    return this.prisma.membershipApplication.create({ data: { ...body, communityId: c.id, applicantId: user.id } });
  }

  @Get('applications/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.prisma.membershipApplication.findMany({ where: { applicantId: user.id }, orderBy: { createdAt: 'desc' }, include: { plan: { select: { name: true } } } });
  }
}
