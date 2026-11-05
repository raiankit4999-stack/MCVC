import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { ADMIN, auth, bootstrap, login, provisionStore, register } from '../helpers';

describe('Service centres: brand authorisation badges', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: ReturnType<typeof request>;
  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('owner declares brands, admin verifies, status change clears verification, public search filters', async () => {
    const admin = await login(app, ADMIN.email, ADMIN.password);
    const store = await provisionStore(app, prisma, admin, { name: 'Brand Care Nadiad', email: 'brandcare@test.local', phone: '9833333333' });

    await http.put('/api/v1/store/brand-services').use(auth(store.token)).send({ items: [{ brand: 'NotABrand', status: 'AUTHORISED' }] }).expect(400);
    const set = await http.put('/api/v1/store/brand-services').use(auth(store.token)).send({ items: [{ brand: 'HP', status: 'AUTHORISED' }, { brand: 'Dell', status: 'THIRD_PARTY' }, { brand: 'ASUS', status: 'UNAUTHORISED' }] }).expect(200);
    expect(set.body.items.map((i: { brand: string; verified: boolean }) => [i.brand, i.verified])).toEqual([['ASUS', false], ['Dell', false], ['HP', false]]);

    // A city manager for another city cannot verify a Nadiad store.
    const mgr = await register(app, 'Anand Manager', 'mgr-anand@test.local', '9833300001');
    const anand = await prisma.city.findFirstOrThrow({ where: { slug: 'anand' } });
    await http.patch('/api/v1/master/staff').use(auth(admin)).send({ email: 'mgr-anand@test.local', role: 'CITY_MANAGER', cityIds: [anand.id] }).expect(200);
    await http.patch(`/api/v1/master/stores/${store.storeId}/brand-services/HP`).use(auth(mgr)).send({ verified: true }).expect(403);
    // Store staff cannot reach the admin endpoint at all.
    await http.patch(`/api/v1/master/stores/${store.storeId}/brand-services/HP`).use(auth(store.token)).send({ verified: true }).expect(403);

    await http.patch(`/api/v1/master/stores/${store.storeId}/brand-services/HP`).use(auth(admin)).send({ verified: true }).expect(200);
    await http.patch(`/api/v1/master/stores/${store.storeId}/brand-services/Apple`).use(auth(admin)).send({ verified: true }).expect(404);

    const pub = await http.get('/api/v1/service-centres?brand=HP&status=AUTHORISED').expect(200);
    expect(pub.body.items).toHaveLength(1);
    expect(pub.body.items[0].brandServices.find((b: { brand: string }) => b.brand === 'HP')).toMatchObject({ status: 'AUTHORISED', verified: true });
    expect((await http.get('/api/v1/service-centres?brand=HP&status=UNAUTHORISED').expect(200)).body.items).toHaveLength(0);

    // Re-declaring HP with a different status removes the verified mark; unchanged Dell keeps state; dropped ASUS disappears.
    await http.put('/api/v1/store/brand-services').use(auth(store.token)).send({ items: [{ brand: 'HP', status: 'THIRD_PARTY' }, { brand: 'Dell', status: 'THIRD_PARTY' }] }).expect(200);
    const rows = await prisma.storeBrandService.findMany({ where: { storeId: store.storeId }, orderBy: { brand: 'asc' } });
    expect(rows.map((r) => [r.brand, r.status, r.verified])).toEqual([['Dell', 'THIRD_PARTY', false], ['HP', 'THIRD_PARTY', false]]);

    const profile = await http.get('/api/v1/stores/brand-care-nadiad').expect(200);
    expect(profile.body.brandServices).toHaveLength(2);
  });
});
