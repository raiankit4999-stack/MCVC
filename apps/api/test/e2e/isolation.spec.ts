/**
 * Launch gate (spec §13): automated negative tests for cross-tenant access.
 * Store A must never be able to read or change Store B's data, through the API
 * or — if the application layer had a bug — through the database (RLS).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { TenantDb } from '../../src/common/tenant-db.service';
import { ADMIN, auth, bootstrap, login, provisionStore } from '../helpers';

describe('Tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: ReturnType<typeof request>;
  let a: { token: string; storeId: string };
  let b: { token: string; storeId: string };
  let aProductId: string;
  let aCustomerId: string;
  let aJobId: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
    http = request(app.getHttpServer());
    const admin = await login(app, ADMIN.email, ADMIN.password);
    a = await provisionStore(app, prisma, admin, { name: 'Alpha Computers', email: 'alpha@test.local', phone: '9811111111' });
    b = await provisionStore(app, prisma, admin, { name: 'Beta Laptops', email: 'beta@test.local', phone: '9822222222', city: 'anand' });

    aProductId = (await http.post('/api/v1/products').use(auth(a.token)).send({ name: 'Alpha SSD', sku: 'SKU-1', hsnCode: '8523', gstRate: 18, mrp: 100, purchasePrice: 50, sellingPrice: 80, openingStock: 3 }).expect(201)).body.id;
    aCustomerId = (await http.post('/api/v1/customers').use(auth(a.token)).send({ name: 'Alpha Customer', phone: '9000011111' }).expect(201)).body.id;
    aJobId = (await http.post('/api/v1/repair-jobs').use(auth(a.token)).send({ customerId: aCustomerId, device: { category: 'Laptop', brand: 'HP', model: 'X' }, reportedProblem: 'Broken hinge' }).expect(201)).body.id;
    // Same SKU and phone are allowed in another store (scoped uniqueness).
    await http.post('/api/v1/products').use(auth(b.token)).send({ name: 'Beta SSD', sku: 'SKU-1', hsnCode: '8523', gstRate: 18, mrp: 100, purchasePrice: 50, sellingPrice: 80 }).expect(201);
    await http.post('/api/v1/customers').use(auth(b.token)).send({ name: 'Beta Customer', phone: '9000011111' }).expect(201);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects selecting a store the user is not a member of', async () => {
    await http.get('/api/v1/products').use(auth(b.token, a.storeId)).expect(403);
    await http.get('/api/v1/customers').use(auth(b.token, a.storeId)).expect(403);
    await http.get('/api/v1/dashboard').use(auth(b.token, 'not-a-uuid')).expect(403);
  });

  it("cannot read Store A's records by id from Store B", async () => {
    await http.get(`/api/v1/products/${aProductId}`).use(auth(b.token)).expect(404);
    await http.get(`/api/v1/customers/${aCustomerId}`).use(auth(b.token)).expect(404);
    await http.get(`/api/v1/repair-jobs/${aJobId}`).use(auth(b.token)).expect(404);
  });

  it("cannot modify Store A's records from Store B", async () => {
    await http.patch(`/api/v1/products/${aProductId}`).use(auth(b.token)).send({ sellingPrice: 1 }).expect(404);
    await http.delete(`/api/v1/products/${aProductId}`).use(auth(b.token)).expect(404);
    await http.patch(`/api/v1/repair-jobs/${aJobId}/status`).use(auth(b.token)).send({ status: 'DIAGNOSING' }).expect(404);
    await http.post('/api/v1/inventory/adjustments').use(auth(b.token)).send({ productId: aProductId, quantity: -1, reason: 'steal' }).expect(404);
    await http.post('/api/v1/invoices').use(auth(b.token)).send({ customerId: aCustomerId, items: [{ productId: aProductId, quantity: 1 }] }).expect(404);
    await http.post('/api/v1/invoices').use(auth(b.token)).send({ customer: { name: 'Xavier', phone: '9000099999' }, items: [{ productId: aProductId, quantity: 1 }] }).expect(404);
    const p = await http.get(`/api/v1/products/${aProductId}`).use(auth(a.token)).expect(200);
    expect(p.body).toMatchObject({ sellingPrice: '80', stockOnHand: 3 });
  });

  it('lists only the caller store data', async () => {
    const products = await http.get('/api/v1/products').use(auth(b.token)).expect(200);
    expect(products.body.items.map((p: { name: string }) => p.name)).toEqual(['Beta SSD']);
    const customers = await http.get('/api/v1/customers?q=9000011111').use(auth(b.token)).expect(200);
    expect(customers.body.items.map((c: { name: string }) => c.name)).toEqual(['Beta Customer']);
    const jobs = await http.get('/api/v1/repair-jobs').use(auth(b.token)).expect(200);
    expect(jobs.body.total).toBe(0);
  });

  it("branding changes affect only the caller's store", async () => {
    await http.patch('/api/v1/store/branding').use(auth(a.token)).send({ tagline: 'Alpha only' }).expect(200);
    const bSettings = await prisma.storeSettings.findUniqueOrThrow({ where: { storeId: b.storeId } });
    expect(bSettings.tagline).toBeNull();
  });

  it('database RLS hides other tenants even if a query forgets the storeId filter', async () => {
    const tenantDb = app.get(TenantDb);
    const seenByB = await tenantDb.run(b.storeId, (tx) => tx.product.findMany()); // no where clause on purpose
    expect(seenByB.every((p) => p.storeId === b.storeId)).toBe(true);
    expect(seenByB.find((p) => p.id === aProductId)).toBeUndefined();

    // Without any tenant context, tenant tables are empty.
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.customer.count()).toBe(0);

    // Writes into another tenant are rejected by the WITH CHECK policy.
    await expect(
      tenantDb.run(b.storeId, (tx) => tx.customer.create({ data: { storeId: a.storeId, name: 'Injected', phone: '+919999999999' } })),
    ).rejects.toThrow(/row-level security/i);
    await expect(tenantDb.run(b.storeId, (tx) => tx.product.updateMany({ where: { id: aProductId }, data: { sellingPrice: 1 } }))).resolves.toEqual({ count: 0 });
  });

  it('public tracking tokens are scoped to the store website they were issued on', async () => {
    const link = await http.post(`/api/v1/repair-jobs/${aJobId}/tracking-link`).use(auth(a.token)).expect(200);
    await http.post('/api/v1/store/website/publish').use(auth(a.token)).expect(200);
    await http.post('/api/v1/store/website/publish').use(auth(b.token)).expect(200);
    await http.get(`/api/v1/public/store/repair-tracking/${link.body.trackingToken}`).set('X-Store-Host', 'alpha-computers.mcvc.test').expect(200);
    await http.get(`/api/v1/public/store/repair-tracking/${link.body.trackingToken}`).set('X-Store-Host', 'beta-laptops.mcvc.test').expect(404);
  });

  it('suspended stores lose workspace and website access', async () => {
    const admin = await login(app, ADMIN.email, ADMIN.password);
    await http.patch(`/api/v1/master/stores/${b.storeId}/status`).use(auth(admin)).send({ membershipStatus: 'SUSPENDED', reason: 'Test' }).expect(200);
    await http.get('/api/v1/products').use(auth(b.token)).expect(403);
    await http.get('/api/v1/public/store').set('X-Store-Host', 'beta-laptops.mcvc.test').expect(404);
  });
});
