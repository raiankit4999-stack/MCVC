import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { FITAG_DATA, FITAG_NETWORK, FITAG_PROFILE } from './fitag';
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
  // A deployment serves one community. Rename an existing one in place (keeps all links), else create it.
  const brand = {
    name: 'Computer Association Network',
    tagline: 'CAN — trusted computer stores, laptop shops & IT services across Gujarat',
    settings: {
      brandColors: ['#C1272D', '#F15A29', '#F7941D'],
      parent: FITAG_PROFILE,
      network: { team: FITAG_DATA.team, events: FITAG_DATA.events, gallery: FITAG_DATA.gallery, serviceCentres: FITAG_DATA.serviceCentres, usefulLinks: FITAG_DATA.usefulLinks },
    } as unknown as Prisma.InputJsonValue,
  };
  const existing = await prisma.community.findFirst({ orderBy: { createdAt: 'asc' } });
  const community = existing
    ? await prisma.community.update({ where: { id: existing.id }, data: brand })
    : await prisma.community.create({ data: { ...brand, slug: 'can' } });

  // FITAG member-association cities, grouped by zone.
  for (const c of FITAG_NETWORK) {
    const data = { name: c.name, state: c.state ?? 'Gujarat', stateCode: c.stateCode ?? '24', zone: c.zone, associationName: c.associationName, associationCode: c.associationCode };
    const city = await prisma.city.upsert({
      where: { communityId_slug: { communityId: community.id, slug: c.slug } },
      create: { ...data, communityId: community.id, slug: c.slug },
      update: data,
    });
    for (const [name, postalCode] of c.areas ?? [['Main Market']]) {
      await prisma.area.upsert({ where: { cityId_slug: { cityId: city.id, slug: slugify(name) } }, create: { cityId: city.id, name, slug: slugify(name), postalCode }, update: {} });
    }
  }

  // Member associations (local IT trade associations under the parent body).
  for (const [i, a] of FITAG_DATA.associations.entries()) {
    const city = await prisma.city.findFirst({ where: { communityId: community.id, slug: a.city } });
    if (!city) continue;
    const data = { name: a.name, code: a.code, zone: a.zone, cityId: city.id, officeBearers: a.officeBearers, sourceUrl: a.source, sortOrder: i };
    await prisma.association.upsert({ where: { slug: a.slug }, create: { ...data, slug: a.slug, communityId: community.id }, update: data });
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
  if (process.env.IMPORT_MEMBER_LISTINGS !== 'false') await importMemberListings(prisma, community.id);
  return { community, admin };
}

/**
 * Directory listings for each association's member firms, as published by the parent body.
 * Names only: no contact details, GSTINs, ratings or logins are created — each owner claims and
 * completes their listing through the normal membership flow. Runs once per association.
 */
export async function importMemberListings(prisma: PrismaClient, communityId: string) {
  const cats = await prisma.businessCategory.findMany({ where: { communityId, slug: { in: ['desktop-computers', 'laptops-and-notebooks', 'computer-accessories', 'laptop-repair'] } }, select: { id: true } });
  const taken = new Set((await prisma.store.findMany({ select: { slug: true } })).map((s) => s.slug));
  let created = 0;
  for (const a of FITAG_DATA.associations) {
    const assoc = await prisma.association.findUnique({ where: { slug: a.slug }, include: { city: { include: { areas: { orderBy: { name: 'asc' } } } } } });
    if (!assoc || !a.firms.length) continue;
    if (await prisma.store.count({ where: { associationId: assoc.id } })) continue;
    const area = assoc.city.areas.find((x) => x.slug === 'main-market') ?? assoc.city.areas[0];
    if (!area) continue;
    const prefix = slugify(a.code ?? a.slug);
    const rows: Prisma.StoreCreateManyInput[] = [];
    const legacy: string[] = [];
    for (const firm of a.firms) {
      const base = `${prefix}-${slugify(firm)}`.slice(0, 80);
      if (taken.has(base)) { legacy.push(base); continue; }
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      taken.add(slug);
      rows.push({
        id: randomUUID(), communityId, cityId: assoc.cityId, areaId: area.id, associationId: assoc.id, name: firm, slug,
        stateCode: assoc.city.stateCode, phone: '', email: '', addressLine: `${assoc.city.name}, ${assoc.city.state}`, websiteStatus: 'DRAFT',
      });
    }
    // Listings created by earlier demo seeds: attach them to their association.
    if (legacy.length) await prisma.store.updateMany({ where: { slug: { in: legacy }, associationId: null }, data: { associationId: assoc.id } });
    if (!rows.length) continue;
    await prisma.store.createMany({ data: rows });
    await prisma.storeSettings.createMany({ data: rows.map((r) => ({ storeId: r.id!, tagline: `Member — ${a.name}${a.code ? ` (${a.code})` : ''}` })) });
    await prisma.storeCategory.createMany({ data: rows.flatMap((r) => cats.map((c) => ({ storeId: r.id!, categoryId: c.id }))) });
    created += rows.length;
  }
  if (created) console.log(`member listings: created ${created}`);
}
