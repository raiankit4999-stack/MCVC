import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { PLATFORM_ROLES } from './decorators';

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES, [context.getHandler(), context.getClass()]) ?? [];
    const user = context.switchToHttp().getRequest().user;
    if (!user?.platformRole || !roles.includes(user.platformRole)) {
      throw new ForbiddenException('Community staff access required');
    }
    return true;
  }
}
