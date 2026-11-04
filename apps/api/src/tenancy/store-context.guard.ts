import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { STORE_PERMISSION } from '../auth/decorators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the active store for ERP/CRM requests.
 *
 * The client may *select* a store with X-Store-Id, but the id is only accepted
 * if the authenticated user holds an active membership in that store. If the
 * header is absent and the user belongs to exactly one store, that store is used.
 */
@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) throw new UnauthorizedException();
    const permission = this.reflector.getAllAndOverride<string>(STORE_PERMISSION, [context.getHandler(), context.getClass()]);

    const requested = req.headers['x-store-id'];
    const requestedId = typeof requested === 'string' && requested ? requested : undefined;
    if (requestedId && !UUID_RE.test(requestedId)) throw new ForbiddenException('Unknown store');

    const memberships = await this.prisma.storeUser.findMany({
      where: { userId: req.user.id, isActive: true, store: { deletedAt: null }, ...(requestedId ? { storeId: requestedId } : {}) },
      include: { role: true, store: true },
      take: 2,
    });
    if (memberships.length === 0) throw new ForbiddenException('You are not a member of this store');
    if (memberships.length > 1) throw new ForbiddenException('Select a store with the X-Store-Id header');
    const m = memberships[0];

    if (m.store.membershipStatus !== 'ACTIVE') {
      throw new ForbiddenException(`Store membership is ${m.store.membershipStatus.toLowerCase()}`);
    }
    if (permission && !m.role.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }

    req.store = {
      id: m.store.id,
      name: m.store.name,
      slug: m.store.slug,
      timezone: m.store.timezone,
      stateCode: m.store.stateCode,
      permissions: m.role.permissions,
      roleName: m.role.name,
    };
    return true;
  }
}
