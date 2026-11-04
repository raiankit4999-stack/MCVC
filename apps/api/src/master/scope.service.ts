import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import type { AuthUser } from '../auth/types';

export interface GeoScope {
  all: boolean;
  cityIds: string[];
  areaIds: string[];
}

/** Geographic visibility for community staff. City/area managers only see their assignments. */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(user: AuthUser): Promise<GeoScope> {
    if (user.platformRole === 'SUPER_ADMIN' || user.platformRole === 'COMMUNITY_ADMIN') return { all: true, cityIds: [], areaIds: [] };
    const scopes = await this.prisma.adminScope.findMany({ where: { userId: user.id } });
    return {
      all: false,
      cityIds: scopes.map((s) => s.cityId).filter((x): x is string => !!x),
      areaIds: scopes.map((s) => s.areaId).filter((x): x is string => !!x),
    };
  }

  storeWhere(scope: GeoScope): Prisma.StoreWhereInput {
    if (scope.all) return {};
    return { OR: [{ cityId: { in: scope.cityIds } }, { areaId: { in: scope.areaIds } }] };
  }

  applicationWhere(scope: GeoScope): Prisma.MembershipApplicationWhereInput {
    if (scope.all) return {};
    return { OR: [{ cityId: { in: scope.cityIds } }, { areaId: { in: scope.areaIds } }] };
  }

  assertCovers(scope: GeoScope, cityId: string, areaId: string) {
    if (scope.all || scope.cityIds.includes(cityId) || scope.areaIds.includes(areaId)) return;
    throw new ForbiddenException('Outside your assigned city/area');
  }
}
