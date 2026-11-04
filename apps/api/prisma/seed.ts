/* Development seed: platform data + a fully populated demo store. Run: pnpm db:seed */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedPlatform } from '../src/seed/platform';
import { DEFAULT_STORE_ROLES } from '../src/tenancy/permissions';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Password@123';

async function main() {
  const { community } = await seedPlatform(prisma, { adminEmail: 'admin@pccommunity.local', adminPassword: DEMO_PASSWORD });
  if (await prisma.store.findUnique({ where: { slug: 'techworld' } })) {
    console.log('Demo data already present.');
    return;
  }
  const nadiad = await prisma.city.findFirstOrThrow({ where: { slug: 'nadiad' }, include: { areas: true } });
  const plan = await prisma.membershipPlan.findFirstOrThrow({ where: { code: 'business' } });
  const cats = await prisma.businessCategory.findMany({ where: { communityId: community.id } });
  const owner = await prisma.user.create({ data: { email: 'owner@techworld.local', name: 'Ankit Patel', phone: '+919825012345', passwordHash: await hash(DEMO_PASSWORD) } });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const store = await tx.store.create({
      data: {
        communityId: community.id, cityId: nadiad.id, areaId: nadiad.areas[0].id, name: 'TechWorld Computers', slug: 'techworld',
        gstin: '24AAPFT1234C1ZI', stateCode: '24', phone: '+919825012345', email: 'hello@techworld.local', addressLine: '12 College Road, Nadiad, Gujarat 387001',
        websiteStatus: 'PUBLISHED', isVerified: true, isFeatured: true, ratingAverage: 4.7, ratingCount: 128,
        categories: { create: cats.slice(0, 12).map((c) => ({ categoryId: c.id })) },
        settings: {
          create: {
            tagline: 'Your local computer partner', heroHeadline: 'Laptops • Desktops • Repair & IT Solutions',
            about: 'Buy, repair and upgrade — all in one place in Nadiad. Authorised partner for leading laptop brands with certified technicians.',
            whatsappNumber: '+919825012345', primaryColor: '#2563EB', accentColor: '#172B4D',
            businessHours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '20:00' })),
          },
        },
      },
    });
    const roles = await Promise.all(DEFAULT_STORE_ROLES.map((r) => tx.storeRole.create({ data: { storeId: store.id, name: r.name, permissions: r.permissions, isSystem: true } })));
    await tx.storeUser.create({ data: { storeId: store.id, userId: owner.id, roleId: roles[0].id } });
    await tx.subscription.create({ data: { storeId: store.id, planId: plan.id, status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) } });
    await tx.inventoryLocation.create({ data: { storeId: store.id, name: 'Main store', isDefault: true } });
    await tx.employee.createMany({
      data: [
        { storeId: store.id, userId: owner.id, name: 'Ankit Patel', designation: 'Owner', isTechnician: true },
        { storeId: store.id, name: 'Rakesh Shah', designation: 'Senior Technician', isTechnician: true },
      ],
    });
    const laptops = await tx.productCategory.create({ data: { storeId: store.id, name: 'Laptops' } });
    const acc = await tx.productCategory.create({ data: { storeId: store.id, name: 'Accessories' } });
    const products = [
      { sku: 'LT-ASUS-TUF15', name: 'ASUS TUF Gaming A15 (Ryzen 7, RTX 4060)', brand: 'ASUS', categoryId: laptops.id, hsnCode: '8471', gstRate: 18, mrp: 89990, purchasePrice: 68000, sellingPrice: 74990, warrantyMonths: 12, isSerialized: true, specs: { processor: 'AMD Ryzen 7 7735HS', ram: '16GB DDR5', storage: '512GB SSD', graphics: 'RTX 4060 8GB', screenSize: '15.6" FHD 144Hz', os: 'Windows 11' }, serials: ['TUF15A001', 'TUF15A002', 'TUF15A003'] },
      { sku: 'LT-LEN-IP5', name: 'Lenovo IdeaPad Slim 5 (i5, 16GB)', brand: 'Lenovo', categoryId: laptops.id, hsnCode: '8471', gstRate: 18, mrp: 72990, purchasePrice: 52000, sellingPrice: 58990, warrantyMonths: 12, isSerialized: true, specs: { processor: 'Intel Core i5-13420H', ram: '16GB', storage: '512GB SSD', screenSize: '15.6" FHD', os: 'Windows 11' }, serials: ['IP5L0001', 'IP5L0002'] },
      { sku: 'AC-LOGI-M331', name: 'Logitech M331 Silent Wireless Mouse', brand: 'Logitech', categoryId: acc.id, hsnCode: '8471', gstRate: 18, mrp: 1495, purchasePrice: 850, sellingPrice: 1099, reorderLevel: 5, qty: 24 },
      { sku: 'AC-SSD-1TB', name: 'Samsung 980 1TB NVMe SSD', brand: 'Samsung', categoryId: acc.id, hsnCode: '8523', gstRate: 18, mrp: 9999, purchasePrice: 6200, sellingPrice: 7299, reorderLevel: 3, qty: 2 },
      { sku: 'AC-RAM-16', name: 'Crucial 16GB DDR4 3200 SODIMM', brand: 'Crucial', categoryId: acc.id, hsnCode: '8473', gstRate: 18, mrp: 4500, purchasePrice: 2800, sellingPrice: 3399, reorderLevel: 4, qty: 10 },
    ];
    for (const p of products) {
      const { serials, qty, ...data } = p as typeof p & { serials?: string[]; qty?: number };
      const stock = serials?.length ?? qty ?? 0;
      const prod = await tx.product.create({ data: { ...data, storeId: store.id, stockOnHand: stock } });
      if (serials) await tx.productSerial.createMany({ data: serials.map((serialNumber) => ({ storeId: store.id, productId: prod.id, serialNumber })) });
      await tx.stockMovement.create({ data: { storeId: store.id, productId: prod.id, movementType: 'OPENING', quantity: stock, unitCost: data.purchasePrice, referenceType: 'seed' } });
    }
    await tx.service.createMany({
      data: [
        { storeId: store.id, name: 'Laptop Repair', slug: 'laptop-repair', description: 'Screen, keyboard, hinge, battery and board-level repair.', price: 499, durationMinutes: 60 },
        { storeId: store.id, name: 'Desktop Repair', slug: 'desktop-repair', description: 'Hardware diagnosis, upgrades and OS issues.', price: 399, durationMinutes: 60 },
        { storeId: store.id, name: 'Data Recovery', slug: 'data-recovery', description: 'HDD/SSD/pen-drive recovery with free evaluation.', price: 1499, durationMinutes: 60 },
        { storeId: store.id, name: 'Custom PC Build', slug: 'custom-pc-build', description: 'Gaming and workstation builds, assembled and tested.', price: 999, durationMinutes: 120 },
        { storeId: store.id, name: 'AMC & IT Support', slug: 'amc-it-support', description: 'Annual maintenance for homes and offices.', price: 4999, priceIsStarting: true, durationMinutes: 60, isBookable: false },
      ],
    });
  });
  console.log(`Seed complete.\n  Admin: admin@pccommunity.local / ${DEMO_PASSWORD}\n  Store owner: owner@techworld.local / ${DEMO_PASSWORD}\n  Store website: http://techworld.mcvc.localhost:3000`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
