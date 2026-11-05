import { Injectable } from '@nestjs/common';
import { MembershipApplication } from '@prisma/client';
import type { Tx } from '../common/tenant-db.service';
import { slugify } from '../common/validators';
import { DEFAULT_STORE_ROLES } from '../tenancy/permissions';

const TRIAL_DAYS = 14;

/**
 * Provisions a complete store workspace from an approved application:
 * store record, categories, settings/branding defaults, default roles, the
 * owner membership, a trial subscription and default inventory location.
 */
@Injectable()
export class ProvisioningService {
  async provision(tx: Tx, app: MembershipApplication) {
    const city = await tx.city.findUniqueOrThrow({ where: { id: app.cityId } });
    const slug = await this.uniqueSlug(tx, app.businessName);

    const store = await tx.store.create({
      data: {
        communityId: app.communityId,
        cityId: app.cityId,
        areaId: app.areaId,
        associationId: app.associationId,
        name: app.businessName,
        slug,
        gstin: app.gstin,
        stateCode: app.gstin?.slice(0, 2) ?? city.stateCode,
        phone: app.phone,
        email: app.email,
        addressLine: app.addressLine,
        membershipStatus: 'ACTIVE',
        websiteStatus: 'DRAFT',
        categories: { create: app.categoryIds.map((categoryId) => ({ categoryId })) },
        settings: {
          create: {
            heroHeadline: `Welcome to ${app.businessName}`,
            businessHours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '20:00' })),
          },
        },
      },
    });

    const roles = await Promise.all(
      DEFAULT_STORE_ROLES.map((r) => tx.storeRole.create({ data: { storeId: store.id, name: r.name, permissions: r.permissions, isSystem: true } })),
    );
    const owner = roles.find((r) => r.name === 'Owner')!;
    await tx.storeUser.create({ data: { storeId: store.id, userId: app.applicantId, roleId: owner.id } });

    const now = new Date();
    await tx.subscription.create({
      data: { storeId: store.id, planId: app.planId, status: 'TRIALING', currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + TRIAL_DAYS * 86400_000) },
    });

    // Tenant-owned rows: switch this transaction into the new store's RLS scope.
    await tx.$executeRaw`SELECT set_config('app.store_id', ${store.id}, true)`;
    await tx.inventoryLocation.create({ data: { storeId: store.id, name: 'Main store', isDefault: true } });
    await tx.employee.create({ data: { storeId: store.id, userId: app.applicantId, name: app.ownerName, phone: app.phone, designation: 'Owner', isTechnician: true } });

    return store;
  }

  private async uniqueSlug(tx: Tx, name: string) {
    const base = slugify(name) || 'store';
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      if (!(await tx.store.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
