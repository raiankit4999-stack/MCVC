/**
 * First milestone (spec §16) as one end-to-end scenario, plus the related
 * acceptance checks from §13.
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { ADMIN, auth, bootstrap, fakeDns, login, nextSlot, register } from '../helpers';

describe('Milestone journey', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: ReturnType<typeof request>;
  let admin: string;
  let owner: string;
  let storeId: string;
  let cityId: string;
  let areaId: string;
  const host = 'shop.vadodaracomputers.in';
  const pub = (r: request.Test) => r.set('X-Store-Host', host);

  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
    http = request(app.getHttpServer());
    admin = await login(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('1–2. master admin creates a city and its areas', async () => {
    const city = await http.post('/api/v1/master/cities').use(auth(admin)).send({ name: 'Vadodara', state: 'Gujarat', stateCode: '24' }).expect(201);
    cityId = city.body.id;
    const area = await http.post('/api/v1/master/areas').use(auth(admin)).send({ cityId, name: 'Alkapuri', postalCode: '390007' }).expect(201);
    areaId = area.body.id;
    await http.post('/api/v1/master/areas').use(auth(admin)).send({ cityId, name: 'Alkapuri' }).expect(409);
    const cities = await http.get('/api/v1/cities').expect(200);
    expect(cities.body.map((c: { slug: string }) => c.slug)).toContain('vadodara');
  });

  it('3. shop owner registers and applies for membership', async () => {
    owner = await register(app, 'Meera Desai', 'meera@vadodaracomputers.in', '9898012345');
    const plan = await prisma.membershipPlan.findFirstOrThrow({ where: { code: 'professional' } });
    const cats = await prisma.businessCategory.findMany({ where: { slug: { in: ['laptop-repair', 'laptops-and-notebooks'] } } });
    const body = { businessName: 'Vadodara Computers', ownerName: 'Meera Desai', phone: '9898012345', email: 'meera@vadodaracomputers.in', gstin: '24AAPFT1234C1ZI', addressLine: '5 RC Dutt Road, Alkapuri', cityId, areaId, categoryIds: cats.map((c) => c.id), planId: plan.id };
    await http.post('/api/v1/membership/applications').use(auth(owner)).send({ ...body, gstin: '24AAPFT1234C1ZX' }).expect(400);
    await http.post('/api/v1/membership/applications').use(auth(owner)).send(body).expect(201);
    await http.post('/api/v1/membership/applications').use(auth(owner)).send(body).expect(409);
    // Not a store member yet.
    await http.get('/api/v1/store').use(auth(owner)).expect(403);
  });

  it('city managers can only review applications in their city', async () => {
    const mgr = await register(app, 'Nadiad Manager', 'mgr@pccommunity.local', '9898000001');
    const nadiad = await prisma.city.findFirstOrThrow({ where: { slug: 'nadiad' } });
    await http.patch('/api/v1/master/staff').use(auth(admin)).send({ email: 'mgr@pccommunity.local', role: 'CITY_MANAGER', cityIds: [nadiad.id] }).expect(200);
    const list = await http.get('/api/v1/master/applications?status=PENDING').use(auth(mgr)).expect(200);
    expect(list.body.total).toBe(0);
    const appRow = await prisma.membershipApplication.findFirstOrThrow({ where: { businessName: 'Vadodara Computers' } });
    await http.patch(`/api/v1/master/applications/${appRow.id}/decision`).use(auth(mgr)).send({ decision: 'APPROVE' }).expect(403);
    await http.post('/api/v1/master/cities').use(auth(mgr)).send({ name: 'Surat', state: 'Gujarat', stateCode: '24' }).expect(403);
    await http.get('/api/v1/master/dashboard').use(auth(owner)).expect(403);
  });

  it('4–5. admin approves and the store workspace is provisioned', async () => {
    const appRow = await prisma.membershipApplication.findFirstOrThrow({ where: { businessName: 'Vadodara Computers' } });
    const res = await http.patch(`/api/v1/master/applications/${appRow.id}/decision`).use(auth(admin)).send({ decision: 'APPROVE', note: 'Documents verified' }).expect(200);
    storeId = res.body.storeId;
    await http.patch(`/api/v1/master/applications/${appRow.id}/decision`).use(auth(admin)).send({ decision: 'APPROVE' }).expect(409);

    const store = await http.get('/api/v1/store').use(auth(owner)).expect(200);
    expect(store.body).toMatchObject({ id: storeId, slug: 'vadodara-computers', cityId, areaId, membershipStatus: 'ACTIVE', websiteStatus: 'DRAFT', role: 'Owner' });
    expect(store.body.subscriptions[0].status).toBe('TRIALING');
    const roles = await http.get('/api/v1/store/roles').use(auth(owner)).expect(200);
    expect(roles.body.map((r: { name: string }) => r.name).sort()).toEqual(['Cashier', 'Front Desk', 'Manager', 'Owner', 'Technician']);

    const dash = await http.get('/api/v1/master/dashboard').use(auth(admin)).expect(200);
    expect(dash.body.stores.active).toBe(1);
    const logs = await http.get('/api/v1/master/audit-logs').use(auth(admin)).expect(200);
    expect(logs.body.map((l: { action: string }) => l.action)).toEqual(expect.arrayContaining(['application.approve', 'store.provision', 'city.create']));
  });

  it('6. owner sets branding, connects and verifies a custom domain, publishes', async () => {
    await http.patch('/api/v1/store/branding').use(auth(owner)).send({ tagline: 'Laptops, repair & IT', primaryColor: '#0F766E', businessHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '19:00' })), bookingSlotCapacity: 1 }).expect(200);
    await http.patch('/api/v1/store/branding').use(auth(owner)).send({ primaryColor: 'red' }).expect(400);
    await http.patch('/api/v1/store/branding').use(auth(owner)).send({ storeId: 'x' }).expect(400); // strict schema

    const added = await http.post('/api/v1/store/domains').use(auth(owner)).send({ hostname: 'Shop.VadodaraComputers.in' }).expect(201);
    expect(added.body.hostname).toBe(host);
    const failed = await http.post(`/api/v1/store/domains/${added.body.id}/verify`).use(auth(owner)).expect(200);
    expect(failed.body.verificationStatus).toBe('FAILED');
    await pub(http.get('/api/v1/public/store')).expect(404);

    fakeDns.records[`TXT:_mcvc-challenge.${host}`] = [`mcvc-verify=${added.body.verificationToken}`];
    fakeDns.records[`CNAME:${host}`] = ['stores.mcvc.test'];
    const ok = await http.post(`/api/v1/store/domains/${added.body.id}/verify`).use(auth(owner)).expect(200);
    expect(ok.body).toMatchObject({ verificationStatus: 'VERIFIED', isPrimary: true, checks: { ownership: true, routing: true } });
    await http.get(`/api/v1/internal/domains/tls-check?domain=${host}`).expect(200);
    await http.get('/api/v1/internal/domains/tls-check?domain=evil.example.com').expect(404);

    await pub(http.get('/api/v1/public/store')).expect(404); // still a draft
    await http.post('/api/v1/store/website/publish').use(auth(owner)).expect(200);
    const site = await pub(http.get('/api/v1/public/store')).expect(200);
    expect(site.body).toMatchObject({ name: 'Vadodara Computers', primaryDomain: host, branding: { tagline: 'Laptops, repair & IT', primaryColor: '#0F766E' } });
    // Platform subdomain resolves too.
    await http.get('/api/v1/public/store').set('X-Store-Host', 'vadodara-computers.mcvc.test').expect(200);
  });

  let laptopId: string;
  let ssdId: string;
  let serviceId: string;
  it('7. store publishes products and services', async () => {
    const laptop = await http.post('/api/v1/products').use(auth(owner)).send({
      name: 'Dell Inspiron 15 (i5)', sku: 'DL-INS15', brand: 'Dell', categoryName: 'Laptops', hsnCode: '8471', gstRate: 18, mrp: 65000, purchasePrice: 48000, sellingPrice: 55000, warrantyMonths: 12, isSerialized: true,
      specs: { processor: 'i5-1335U', ram: '16GB', storage: '512GB SSD' }, serials: [{ serialNumber: 'DLSN001' }, { serialNumber: 'DLSN002' }],
    }).expect(201);
    laptopId = laptop.body.id;
    expect(laptop.body.stockOnHand).toBe(2);
    const ssd = await http.post('/api/v1/products').use(auth(owner)).send({ name: 'Kingston 512GB SSD', sku: 'KS-512', hsnCode: '8523', gstRate: 18, mrp: 4000, purchasePrice: 2500, sellingPrice: 3200, openingStock: 5, reorderLevel: 2 }).expect(201);
    ssdId = ssd.body.id;
    await http.post('/api/v1/products').use(auth(owner)).send({ name: 'Bad rate', sku: 'X1', hsnCode: '8471', gstRate: 7, mrp: 1, purchasePrice: 1, sellingPrice: 1 }).expect(400);
    await http.post('/api/v1/products').use(auth(owner)).send({ name: 'Dup', sku: 'DL-INS15', hsnCode: '8471', gstRate: 18, mrp: 1, purchasePrice: 1, sellingPrice: 1 }).expect(400);
    const svc = await http.post('/api/v1/services').use(auth(owner)).send({ name: 'Laptop Repair', price: 500, gstRate: 18 }).expect(201);
    serviceId = svc.body.id;

    const pubProducts = await pub(http.get('/api/v1/public/store/products')).expect(200);
    expect(pubProducts.body.total).toBe(2);
    expect(pubProducts.body.items[0]).not.toHaveProperty('purchasePrice');
    const dir = await http.get('/api/v1/stores?city=vadodara&product=inspiron').expect(200);
    expect(dir.body.items.map((s: { slug: string }) => s.slug)).toEqual(['vadodara-computers']);
  });

  let bookingRef: string;
  it('8–9. customer visits the website and books a laptop repair; slots cannot be double-booked', async () => {
    const slot = nextSlot(3, 11);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(slot);
    const slots = await pub(http.get(`/api/v1/public/store/slots?date=${date}`)).expect(200);
    expect(slots.body.find((s: { startsAt: string }) => s.startsAt === slot.toISOString())).toMatchObject({ remaining: 1, available: true });

    const payload = (i: number) => ({ name: `Customer ${i}`, phone: `98765432${10 + i}`, serviceId, slotStart: slot.toISOString(), deviceType: 'Laptop', deviceModel: 'HP Pavilion', problem: 'No display' });
    // Capacity is 1: fire 5 concurrent bookings for the same slot; exactly one may succeed.
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => pub(http.post('/api/v1/public/store/bookings')).send(payload(i))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    bookingRef = results.find((r) => r.status === 201)!.body.reference;

    await pub(http.post('/api/v1/public/store/bookings')).send({ ...payload(9), slotStart: new Date(Date.parse(`${date}T03:00:00+05:30`)).toISOString() }).expect(400); // 3am: outside hours
    await pub(http.post('/api/v1/public/store/inquiries')).send({ name: 'Ravi', phone: '9876500000', message: 'Do you stock MacBook chargers?' }).expect(201);
  });

  let jobId: string;
  let trackingToken: string;
  it('10. store generates a job card from the booking', async () => {
    const bookings = await http.get('/api/v1/bookings').use(auth(owner)).expect(200);
    const booking = bookings.body.find((b: { reference: string }) => b.reference === bookingRef);
    expect(booking.status).toBe('PENDING_CONFIRMATION');
    await http.patch(`/api/v1/bookings/${booking.id}`).use(auth(owner)).send({ status: 'CONFIRMED' }).expect(200);

    const job = await http.post('/api/v1/repair-jobs').use(auth(owner)).send({
      customerId: booking.customerId, bookingId: booking.id,
      device: { category: 'Laptop', brand: 'HP', model: 'Pavilion 15', serialNumber: 'HPSN998877' },
      reportedProblem: 'No display', physicalCondition: 'Minor scratches on lid', accessories: ['Charger'],
    }).expect(201);
    jobId = job.body.id;
    trackingToken = job.body.trackingToken;
    expect(job.body.jobNumber).toMatch(/^JC\/\d{4}-\d{2}\/00001$/);
    expect(job.body).not.toHaveProperty('trackingTokenHash', trackingToken);

    const job2 = await http.post('/api/v1/repair-jobs').use(auth(owner)).send({ customer: { name: 'Walk In', phone: '9000000001' }, device: { category: 'Desktop', brand: 'Assembled', model: 'i3' }, reportedProblem: 'Slow' }).expect(201);
    expect(job2.body.jobNumber).toMatch(/00002$/);

    const track = await pub(http.get(`/api/v1/public/store/repair-tracking/${trackingToken}`)).expect(200);
    expect(track.body).toMatchObject({ status: 'RECEIVED', device: { brand: 'HP' } });
    expect(track.body).not.toHaveProperty('customer');
    await pub(http.get(`/api/v1/public/store/repair-tracking/${'x'.repeat(32)}`)).expect(404);

    const cust = await http.get('/api/v1/customers?q=HPSN998877').use(auth(owner)).expect(200);
    expect(cust.body.total).toBe(1);
  });

  it('11. technician updates status; customer approves the quotation online', async () => {
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'DELIVERED' }).expect(409);
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'DIAGNOSING', note: 'Opening the chassis' }).expect(200);
    await http.post(`/api/v1/repair-jobs/${jobId}/quote`).use(auth(owner)).send({ diagnosis: 'Faulty SSD and display cable', estimateAmount: 4500 }).expect(200);
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'IN_PROGRESS' }).expect(409); // needs approval

    const approved = await pub(http.post(`/api/v1/public/store/repair-tracking/${trackingToken}/approval`)).send({ decision: 'APPROVED' }).expect(200);
    expect(approved.body).toMatchObject({ approval: 'APPROVED', status: 'IN_PROGRESS' });
    await pub(http.post(`/api/v1/public/store/repair-tracking/${trackingToken}/approval`)).send({ decision: 'REJECTED' }).expect(409);

    await http.post(`/api/v1/repair-jobs/${jobId}/parts`).use(auth(owner)).send({ productId: ssdId, quantity: 1 }).expect(201);
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'QUALITY_CHECK' }).expect(200);
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'READY', note: 'Ready for pickup' }).expect(200);
    const ssd = await http.get(`/api/v1/products/${ssdId}`).use(auth(owner)).expect(200);
    expect(ssd.body.stockOnHand).toBe(4);
  });

  let invoiceId: string;
  it('12. store generates a GST invoice; payment updates the balance; delivery requires payment', async () => {
    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'DELIVERED' }).expect(409);
    const inv = await http.post('/api/v1/invoices').use(auth(owner)).send({
      docType: 'TAX_INVOICE', repairJobId: jobId,
      items: [{ serviceId, quantity: 1, unitPrice: 1300 }, { productId: ssdId, quantity: 1, unitPrice: 3200 }],
      payments: [{ amount: 2000, method: 'UPI', reference: 'UPI123' }],
    }).expect(201);
    invoiceId = inv.body.id;
    expect(inv.body).toMatchObject({ invoiceNumber: expect.stringMatching(/^INV\/\d{4}-\d{2}\/00001$/), isInterState: false, taxableTotal: '4500', cgstTotal: '405', sgstTotal: '405', igstTotal: '0', grandTotal: '5310', amountPaid: '2000', paymentStatus: 'PARTIAL' });
    expect(inv.body.items[0]).not.toHaveProperty('unitCost');

    await http.post('/api/v1/payments').use(auth(owner)).send({ invoiceId, amount: 9999, method: 'CASH' }).expect(400);
    const p = await http.post('/api/v1/payments').use(auth(owner)).send({ invoiceId, amount: 3310, method: 'CASH' }).expect(201);
    expect(p.body.amount).toBe('3310');
    const after = await http.get(`/api/v1/invoices/${invoiceId}`).use(auth(owner)).expect(200);
    expect(after.body).toMatchObject({ paymentStatus: 'PAID', balanceDue: '0.00' });

    await http.patch(`/api/v1/repair-jobs/${jobId}/status`).use(auth(owner)).send({ status: 'DELIVERED', note: 'Handed over' }).expect(200);
  });

  it('13. customer receives invoice and repair-completion notifications', async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.store_id', ${storeId}, true)`;
      return tx.notification.findMany({ where: { storeId }, orderBy: { createdAt: 'asc' } });
    });
    const templates = rows.map((r) => r.template);
    expect(templates).toEqual(expect.arrayContaining(['booking.received', 'repair.received', 'repair.quotation', 'repair.ready', 'invoice.issued', 'repair.delivered']));
    const track = await pub(http.get(`/api/v1/public/store/repair-tracking/${trackingToken}`)).expect(200);
    expect(track.body.status).toBe('DELIVERED');
    expect(track.body.invoice).toMatchObject({ paymentStatus: 'PAID' });
  });

  it('serial-number sale assigns the serial and decrements stock; purchase increases stock', async () => {
    await http.post('/api/v1/invoices').use(auth(owner)).send({ customer: { name: 'Buyer', phone: '9123456789' }, items: [{ productId: laptopId, quantity: 1 }] }).expect(400); // serial required
    await http.post('/api/v1/invoices').use(auth(owner)).send({ customer: { name: 'Buyer', phone: '9123456789' }, items: [{ productId: laptopId, quantity: 1, serialNumbers: ['NOPE'] }] }).expect(409);
    const inv = await http.post('/api/v1/invoices').use(auth(owner)).send({
      customer: { name: 'Buyer Maharashtra', phone: '9123456789', gstin: '27AAPFU0939F1ZV' },
      items: [{ productId: laptopId, quantity: 1, serialNumbers: ['DLSN001'] }],
    }).expect(201);
    expect(inv.body).toMatchObject({ isInterState: true, placeOfSupply: '27', igstTotal: '9900', cgstTotal: '0', grandTotal: '64900' });
    const product = await http.get(`/api/v1/products/${laptopId}`).use(auth(owner)).expect(200);
    expect(product.body.stockOnHand).toBe(1);
    expect(product.body.serials.find((s: { serialNumber: string }) => s.serialNumber === 'DLSN001')).toMatchObject({ status: 'SOLD' });
    await http.post('/api/v1/invoices').use(auth(owner)).send({ customer: { name: 'B2', phone: '9123456780' }, items: [{ productId: laptopId, quantity: 1, serialNumbers: ['DLSN001'] }] }).expect(409);

    // Cancel restores stock and serial.
    await http.post(`/api/v1/invoices/${inv.body.id}/cancel`).use(auth(owner)).send({ reason: 'Customer changed mind' }).expect(200);
    const restored = await http.get(`/api/v1/products/${laptopId}`).use(auth(owner)).expect(200);
    expect(restored.body.stockOnHand).toBe(2);

    const supplier = await http.post('/api/v1/suppliers').use(auth(owner)).send({ name: 'Rashi Peripherals', gstin: '24AAPFT1234C1ZI' }).expect(201);
    await http.post('/api/v1/purchases').use(auth(owner)).send({ supplierId: supplier.body.id, receiveNow: true, items: [{ productId: ssdId, quantity: 10, unitCost: 2400, gstRate: 18 }] }).expect(201);
    const ssd = await http.get(`/api/v1/products/${ssdId}`).use(auth(owner)).expect(200);
    expect(ssd.body.stockOnHand).toBe(13);

    const dash = await http.get('/api/v1/dashboard').use(auth(owner)).expect(200);
    expect(dash.body.todaySales.count).toBe(1);
    expect(dash.body.grossProfit).toBe(4500 - 2500);
    const gst = await http.get('/api/v1/reports/gst').use(auth(owner)).expect(200);
    expect(gst.body.totals).toMatchObject({ taxable: 4500, cgst: 405, sgst: 405 });
  });

  it('ledgers are append-only at the database level', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.store_id', ${storeId}, true)`;
        await tx.$executeRaw`UPDATE payments SET amount = 1`;
      }),
    ).rejects.toThrow(/append-only/);
  });

  it('cookie-authenticated mutations require the CSRF header', async () => {
    const res = await http.post('/api/v1/auth/login').send({ login: 'meera@vadodaracomputers.in', password: 'StrongPass#2026' }).expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toMatch(/HttpOnly/i);
    await http.post('/api/v1/customers').set('Cookie', cookies).send({ name: 'Cookie User', phone: '9000000002' }).expect(403);
    await http.post('/api/v1/customers').set('Cookie', cookies).set('x-mcvc-csrf', '1').send({ name: 'Cookie User', phone: '9000000002' }).expect(201);
    // Refresh rotation: the old refresh token stops working.
    const r1 = await http.post('/api/v1/auth/refresh').send({ refreshToken: res.body.refreshToken }).expect(200);
    await http.post('/api/v1/auth/refresh').send({ refreshToken: res.body.refreshToken }).expect(401);
    await http.post('/api/v1/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(200);
  });
});
