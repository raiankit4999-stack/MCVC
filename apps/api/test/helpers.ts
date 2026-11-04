import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://mcvc:mcvc@localhost:5432/mcvc_test?schema=public';
process.env.PLATFORM_DOMAIN = 'mcvc.test';
process.env.DOMAIN_CNAME_TARGET = 'stores.mcvc.test';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.NOTIFICATIONS_WORKER = 'off';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { loadConfig } from '../src/config';
import { DNS_RESOLVER, DnsResolver } from '../src/domains/dns';
import { seedPlatform } from '../src/seed/platform';

export const fakeDns: DnsResolver & { records: Record<string, string[]> } = {
  records: {},
  async txt(h) { return this.records[`TXT:${h}`] ?? []; },
  async cname(h) { return this.records[`CNAME:${h}`] ?? []; },
  async a(h) { return this.records[`A:${h}`] ?? []; },
};

export async function resetDatabase(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DNS_RESOLVER)
    .useValue(fakeDns)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, loadConfig());
  await app.init();
  return app;
}

export const ADMIN = { email: 'admin@test.local', password: 'AdminPass#2026' };

export async function bootstrap() {
  const prisma = new PrismaClient();
  await resetDatabase(prisma);
  await seedPlatform(prisma, { adminEmail: ADMIN.email, adminPassword: ADMIN.password });
  const app = await createTestApp();
  return { app, prisma };
}

export async function login(app: INestApplication, email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ login: email, password }).expect(200);
  return res.body.accessToken;
}

export async function register(app: INestApplication, name: string, email: string, phone: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ name, email, phone, password: 'StrongPass#2026' }).expect(201);
  return res.body.accessToken;
}

/** Registers an owner, applies, approves as admin and returns the provisioned store. */
export async function provisionStore(app: INestApplication, prisma: PrismaClient, adminToken: string, opts: { name: string; email: string; phone: string; city?: string }) {
  const http = request(app.getHttpServer());
  const token = await register(app, `${opts.name} Owner`, opts.email, opts.phone);
  const city = await prisma.city.findFirstOrThrow({ where: { slug: opts.city ?? 'nadiad' }, include: { areas: true } });
  const plan = await prisma.membershipPlan.findFirstOrThrow({ where: { code: 'business' } });
  const cats = await prisma.businessCategory.findMany({ take: 2 });
  const app1 = await http
    .post('/api/v1/membership/applications')
    .set('Authorization', `Bearer ${token}`)
    .send({ businessName: opts.name, ownerName: `${opts.name} Owner`, phone: opts.phone, email: opts.email, gstin: '24AAPFT1234C1ZI', addressLine: '1 Main Road, Gujarat', cityId: city.id, areaId: city.areas[0].id, categoryIds: cats.map((c) => c.id), planId: plan.id })
    .expect(201);
  const decided = await http.patch(`/api/v1/master/applications/${app1.body.id}/decision`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'APPROVE' }).expect(200);
  return { token, storeId: decided.body.storeId as string };
}

export function auth(token: string, storeId?: string) {
  return (req: request.Test) => {
    req.set('Authorization', `Bearer ${token}`);
    if (storeId) req.set('X-Store-Id', storeId);
    return req;
  };
}

/** Next business-hours slot (10:00 IST, at least 2 days ahead, skipping Sunday). */
export function nextSlot(daysAhead = 2, hourIst = 10): Date {
  const d = new Date(Date.now() + daysAhead * 86400_000);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  const ymd = d.toISOString().slice(0, 10);
  return new Date(Date.parse(`${ymd}T${String(hourIst).padStart(2, '0')}:00:00+05:30`));
}
