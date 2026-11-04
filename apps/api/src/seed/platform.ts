import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

export const CATEGORIES: { name: string; kind: 'PRODUCT' | 'SERVICE' }[] = [
  { name: 'Desktop computers', kind: 'PRODUCT' },
  { name: 'Laptops and notebooks', kind: 'PRODUCT' },
  { name: 'Gaming PCs', kind: 'PRODUCT' },
  { name: 'Computer accessories', kind: 'PRODUCT' },
  { name: 'Printers and scanners', kind: 'PRODUCT' },
  { name: 'CCTV and networking', kind: 'PRODUCT' },
  { name: 'Computer hardware', kind: 'PRODUCT' },
  { name: 'Software and licensing', kind: 'PRODUCT' },
  { name: 'Laptop repair', kind: 'SERVICE' },
  { name: 'Desktop repair', kind: 'SERVICE' },
  { name: 'Chip-level motherboard repair', kind: 'SERVICE' },
  { name: 'Data recovery', kind: 'SERVICE' },
  { name: 'AMC and IT maintenance', kind: 'SERVICE' },
  { name: 'Corporate IT support', kind: 'SERVICE' },
  { name: 'Custom PC assembly', kind: 'SERVICE' },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Idempotently creates the community, locations, categories, plans and the super admin. */
export async function seedPlatform(prisma: PrismaClient, opts: { adminEmail: string; adminPassword: string }) {
  const community = await prisma.community.upsert({
    where: { slug: 'pc-community' },
    create: { name: 'PC Community', slug: 'pc-community', tagline: "India's computer community network", settings: { supportEmail: 'support@example.com' } },
    update: {},
  });

  const cities = [
    { name: 'Ahmedabad', areas: [['Navrangpura', '380009'], ['Satellite', '380015'], ['Maninagar', '380008'], ['CG Road', '380006']] },
    { name: 'Nadiad', areas: [['College Road', '387001'], ['Santram Road', '387001'], ['Station Road', '387001']] },
    { name: 'Anand', areas: [['Vallabh Vidyanagar', '388120'], ['Station Road', '388001'], ['Ganesh Chowkdi', '388001']] },
  ];
  for (const c of cities) {
    const city = await prisma.city.upsert({
      where: { communityId_slug: { communityId: community.id, slug: slugify(c.name) } },
      create: { communityId: community.id, name: c.name, slug: slugify(c.name), state: 'Gujarat', stateCode: '24' },
      update: {},
    });
    for (const [name, postalCode] of c.areas) {
      await prisma.area.upsert({ where: { cityId_slug: { cityId: city.id, slug: slugify(name) } }, create: { cityId: city.id, name, slug: slugify(name), postalCode }, update: {} });
    }
  }

  for (const [i, cat] of CATEGORIES.entries()) {
    await prisma.businessCategory.upsert({
      where: { communityId_slug: { communityId: community.id, slug: slugify(cat.name) } },
      create: { communityId: community.id, name: cat.name, slug: slugify(cat.name), kind: cat.kind, sortOrder: i },
      update: {},
    });
  }

  const plans = [
    { code: 'starter', name: 'Starter', description: 'Website + basic CRM for small repair shops', priceMonthly: 499, priceYearly: 4999, features: ['website', 'crm', 'bookings', 'repairs'] },
    { code: 'professional', name: 'Professional', description: 'Website + ERP + CRM for growing computer stores', priceMonthly: 1499, priceYearly: 14999, features: ['website', 'crm', 'erp', 'billing', 'inventory', 'bookings', 'repairs'] },
    { code: 'business', name: 'Business', description: 'Full ERP with staff and analytics', priceMonthly: 2999, priceYearly: 29999, features: ['website', 'crm', 'erp', 'billing', 'inventory', 'bookings', 'repairs', 'staff', 'analytics', 'custom-domain'] },
    { code: 'enterprise', name: 'Enterprise', description: 'Advanced permissions and integrations', priceMonthly: 6999, priceYearly: 69999, features: ['website', 'crm', 'erp', 'billing', 'inventory', 'bookings', 'repairs', 'staff', 'analytics', 'custom-domain', 'advanced-roles', 'integrations'] },
  ];
  for (const [i, p] of plans.entries()) {
    await prisma.membershipPlan.upsert({ where: { communityId_code: { communityId: community.id, code: p.code } }, create: { ...p, communityId: community.id, sortOrder: i }, update: {} });
  }

  const admin = await prisma.user.upsert({
    where: { email: opts.adminEmail },
    create: { email: opts.adminEmail, name: 'Community Owner', passwordHash: await hash(opts.adminPassword), platformRole: 'SUPER_ADMIN' },
    update: {},
  });
  return { community, admin };
}
