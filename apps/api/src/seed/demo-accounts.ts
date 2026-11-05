import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

/** Shared password for the public demo accounts. Demo servers only — never on a live network. */
export const DEMO_PASSWORD = 'CanDemo@2026';

export const DEMO_ACCOUNTS = [
  { email: 'admin@demo.can', name: 'Demo Community Admin', label: 'Community admin', description: 'Approve stores, manage cities, plans and the whole network', platformRole: 'COMMUNITY_ADMIN' as const },
  { email: 'manager.nadiad@demo.can', name: 'Demo Nadiad Manager', label: 'City manager · Nadiad', description: 'Sees and approves only Nadiad stores', platformRole: 'CITY_MANAGER' as const, cityScope: 'nadiad' },
  { email: 'owner@demo.can', name: 'Demo Store Owner', label: 'Store owner · TechWorld', description: 'Full ERP: sales, stock, repairs, reports, website', storeRole: 'Owner' },
  { email: 'cashier@demo.can', name: 'Demo Cashier', label: 'Cashier · TechWorld', description: 'POS, invoices and payments only', storeRole: 'Cashier' },
  { email: 'technician@demo.can', name: 'Demo Technician', label: 'Technician · TechWorld', description: 'Repair jobs, diagnosis and status updates', storeRole: 'Technician' },
];

export const demoModeEnabled = () => process.env.DEMO_MODE === 'true' || process.env.SEED_DEMO === 'true' || process.env.NODE_ENV !== 'production';

/** Creates/refreshes the demo logins. Store roles attach to the demo store (slug "techworld") if it exists. */
export async function seedDemoAccounts(prisma: PrismaClient) {
  const passwordHash = await hash(DEMO_PASSWORD);
  const store = await prisma.store.findUnique({ where: { slug: 'techworld' }, include: { roles: true } });
  for (const a of DEMO_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      create: { email: a.email, name: a.name, passwordHash, platformRole: a.platformRole ?? null },
      update: { passwordHash, isActive: true, platformRole: a.platformRole ?? null },
    });
    if (a.cityScope) {
      const city = await prisma.city.findFirst({ where: { slug: a.cityScope } });
      if (city && !(await prisma.adminScope.findFirst({ where: { userId: user.id, cityId: city.id } }))) {
        await prisma.adminScope.create({ data: { userId: user.id, cityId: city.id } });
      }
    }
    if (a.storeRole && store) {
      const role = store.roles.find((r) => r.name === a.storeRole);
      if (!role) continue;
      await prisma.storeUser.upsert({
        where: { storeId_userId: { storeId: store.id, userId: user.id } },
        create: { storeId: store.id, userId: user.id, roleId: role.id },
        update: { roleId: role.id, isActive: true },
      });
      if (a.storeRole === 'Technician') {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.store_id', ${store.id}, true)`;
          const exists = await tx.employee.findFirst({ where: { storeId: store.id, userId: user.id } });
          if (!exists) await tx.employee.create({ data: { storeId: store.id, userId: user.id, name: 'Demo Technician', designation: 'Technician', isTechnician: true } });
        });
      }
    }
  }
  console.log(`demo accounts ready (${DEMO_ACCOUNTS.length}) — password ${DEMO_PASSWORD}`);
}
