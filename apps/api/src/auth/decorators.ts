import { createParamDecorator, ExecutionContext, SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import type { Permission } from '../tenancy/permissions';
import { StoreContextGuard } from '../tenancy/store-context.guard';
import { PlatformRoleGuard } from './platform-role.guard';
import type { AuthUser, StoreContext } from './types';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const PLATFORM_ROLES = 'platformRoles';
/** Restricts a route to community staff with one of the given roles. */
export const PlatformRoles = (...roles: PlatformRole[]) =>
  applyDecorators(SetMetadata(PLATFORM_ROLES, roles), UseGuards(PlatformRoleGuard), ApiBearerAuth());

export const STORE_PERMISSION = 'storePermission';
/**
 * Requires an authenticated store member (store chosen via X-Store-Id and
 * verified against the user's memberships) holding the given permission.
 */
export const StorePermission = (permission: Permission) =>
  applyDecorators(
    SetMetadata(STORE_PERMISSION, permission),
    UseGuards(StoreContextGuard),
    ApiBearerAuth(),
    ApiHeader({ name: 'X-Store-Id', required: false, description: 'Store to act on; must be one of your memberships' }),
  );

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
export const CurrentStore = createParamDecorator((_: unknown, ctx: ExecutionContext): StoreContext => ctx.switchToHttp().getRequest().store);
