# CAN — Computer Association Network

A multi-tenant SaaS and business community network for computer shops, laptop stores, repair centres and IT service providers, built for the member associations of **FITAG — Federation of Information Technology Associations of Gujarat** (https://fitag.in). The community owner runs the network. Each member store gets its own branded website and domain, plus its own ERP/CRM and customer base.

```
apps/
  api/   NestJS modular monolith · Prisma · PostgreSQL (row-level security)
  web/   Next.js 15 · Tailwind — community site, master admin, store ERP, store websites
deploy/  Docker Compose stack for a shared VPS, nginx/Caddy configs, backups
```

## Four interfaces, one web app

| Interface | URL | Who |
|---|---|---|
| Community website | `/`, `/stores`, `/stores/:slug`, `/join` | Customers, prospective members |
| Master admin | `/admin` | Community owner, city/area managers |
| Store ERP & CRM | `/erp` | Store owners and staff |
| Store website | any store hostname (`<slug>.<PLATFORM_DOMAIN>` or a verified custom domain) | Store customers |

`apps/web/src/middleware.ts` routes requests by hostname. Community hosts serve the community site. Every other host is rewritten to `/site/<host>/…`, which renders that store's branded website. For local preview, use `http://localhost:3000/site/<slug>.mcvc.localhost`.

The browser only talks to the web app. It proxies `/api/v1/*` to the API so that the httpOnly auth cookies stay same-origin.

## Tenant isolation (the launch gate)

1. **Application layer:**
   - Every store-scoped route goes through `StoreContextGuard`. A client may choose a store (`X-Store-Id`), but the server accepts it only if the authenticated user holds an active membership in that store.
   - Public store APIs resolve the store from the visitor's hostname (`HostResolver`). They never trust a store ID sent by the client.
   - Every query also filters by `storeId`.
2. **Database layer:** every tenant-owned table has `FORCE ROW LEVEL SECURITY` with a `tenant_isolation` policy. `TenantDb.run(storeId, fn)` sets `app.store_id` for each transaction, so a query that forgets its `storeId` filter still cannot see or write another store's rows. The app must connect as a **non-superuser** role, because superusers bypass RLS. The deploy stack creates that role for you.
3. **Ledgers are append-only:** database triggers block UPDATE/DELETE on payments, stock movements and audit logs. Corrections are made with reversal records.

`apps/api/test/e2e/isolation.spec.ts` runs the cross-tenant tests: API-level reads and writes, RLS without filters, RLS `WITH CHECK` on inserts, scoping of tracking links, and suspension.

## What is implemented

- **Community:**
  - Directory with filters: city, area, category, product availability, service, verified, open now, rating.
  - Store profiles.
  - Onboarding: register → apply → review → approve.
  - Approval provisions a full workspace: roles, owner membership, settings, a trial subscription, an inventory location and an employee record.
  - Membership approval and subscription status are kept as separate states.
- **Master admin:**
  - Network dashboard (counts only, no tenant records).
  - Cities and areas, categories, applications, store suspension/verification/featuring, configurable plan pricing.
  - Staff roles: city and area managers only see and act within their assigned scope.
  - Audit log.
- **Store website engine:**
  - Branding editor: logo, colours, typography presets, hero, hours, WhatsApp, SEO.
  - Publish and unpublish.
  - Custom domains: DNS TXT ownership check, CNAME/A routing check, primary domain.
  - TLS `ask` endpoint for Caddy on-demand certificates.
- **ERP/CRM:**
  - Products with computer specs and serial/IMEI tracking.
  - An append-only stock ledger with adjustments, purchases/GRN and suppliers.
  - POS with barcode-scan flow and serial selection.
  - GST tax invoices and bills of supply: CGST/SGST vs IGST by place of supply, tax-inclusive or exclusive prices, rupee round-off, per-financial-year numbering.
  - Quotations and proforma invoices.
  - Partial and multiple payments, plus cancellation by reversal.
  - Customers (searchable by name, phone, email, invoice number or device serial), lifetime value, leads.
  - Dashboard and reports: sales, inventory valuation and dead stock, P&L (operational), GST summary.
- **Repairs:**
  - Job cards with FY numbering, intake (condition, accessories), technician assignment.
  - Enforced status machine.
  - Quotation → customer approval (online or by staff).
  - Parts consumption from stock.
  - Delivery is blocked until a paid invoice exists, unless marked no-charge.
- **Repair tracking:**
  - The tracking link uses an unguessable token, stored only as a hash.
  - It shows public timeline entries only.
- **Bookings:**
  - Bookable slots come from business hours.
  - Slot reservation is transactional, with per-slot capacity and a per-technician unique index, so double-booking is impossible. This is tested with concurrent requests.
- **Security:**
  - argon2id passwords.
  - Rotating refresh sessions with revocation.
  - CSRF header required for cookie-authenticated writes.
  - Rate limits, helmet, zod validation on every input, consistent error filter.
- **Notifications:** a transactional outbox (`notifications` table) for WhatsApp/SMS/email templates. The delivery worker currently logs instead of sending; plug in a WhatsApp Cloud API / SMS / SMTP driver via `NotificationsService.setDriver`.

### Not yet built (next milestones)

- Customer portal accounts (repair tracking currently uses links).
- Offers/promotions and reviews.
- Credit/debit notes and sales returns (the document types exist; no workflow yet).
- Razorpay subscription billing and webhooks.
- Expenses, a double-entry ledger and HR (attendance, commissions).
- Warranty claims/RMA workflow.
- File uploads (S3) — images are URLs for now.
- MFA for admins.
- BullMQ worker and real notification drivers.
- OpenAPI export script.

GST rates, HSN/SAC codes and invoice formats are configuration supplied by each store. The arithmetic is tested, but tax treatment must be validated by a tax professional before production use. The platform does not claim statutory compliance.

## Brand and network data

- Brand: CAN logo (`apps/web/src/components/brand.tsx`, `app/icon.svg`); palette crimson `#C1272D`, orange `#F15A29`, amber `#F7941D`. Interactive orange is `#C2410C` (5.2:1 with white text).
- FITAG network data (`apps/api/src/seed/fitag-data.json`, extracted from fitag.in's public WordPress API): 42 member associations by zone with office bearers and 2,798 member firms, the FITAG team, events, gallery, brand service centres and useful links. Images are in `apps/web/public/fitag/`.
- Seed logic (`apps/api/src/seed/fitag.ts`, `platform.ts`): member-association cities by zone, parent-body profile, and the Computer Association of Nadiad member firm names. These are applied on every API start (`bootstrap-platform`). Member listings carry names only; owners complete their own contact details by claiming the listing.
- FITAG logo and banner (`apps/web/public/brand/`) are used with credit and a link to fitag.in.

## Local development

Requirements: Node 22, pnpm 10, PostgreSQL 16.

```bash
pnpm install
```

Create a database and a non-superuser role:

```bash
sudo -u postgres psql -c "CREATE ROLE mcvc LOGIN PASSWORD 'mcvc' CREATEDB" -c "CREATE DATABASE mcvc OWNER mcvc" -c "CREATE DATABASE mcvc_test OWNER mcvc"
```

```bash
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env.local
```

```bash
pnpm --filter @mcvc/api db:migrate && pnpm --filter @mcvc/api db:seed
```

```bash
pnpm dev
```

The seed prints its logins:
- admin `admin@can.local` / `Password@123`
- store owner `owner@techworld.local` / `Password@123`

The demo store website is at http://techworld.mcvc.localhost:3000 (Chrome resolves `*.localhost`). API docs are at http://localhost:4000/api/docs.

Run the tests (unit + e2e against the `mcvc_test` database):

```bash
pnpm test
```

## Deploying on a VPS that already runs other apps

The stack in `deploy/` is designed to live alongside other apps on the same server:
- Its Docker Compose project, network and volume names are all prefixed `mcvc`.
- Postgres runs in its own container with no published port.
- The web and API containers bind to `127.0.0.1` only (ports 3100/4100 by default, configurable).

Your existing nginx or Caddy decides which domains reach it. Nothing else on the server is touched.

```bash
git clone <this repo> /opt/mcvc && cd /opt/mcvc
```

```bash
cp deploy/.env.example deploy/.env && nano deploy/.env
```

Fill in the domains, secrets and admin login (`openssl rand -base64 48` generates secrets). Check that `WEB_PORT`/`API_PORT` are free with `ss -tlnp`. Then build and start:

```bash
./deploy/deploy.sh
```

Then:
1. **DNS:**
   - `A` record for your community domain → VPS IP.
   - `A` record for `*.<PLATFORM_DOMAIN>` (wildcard) → VPS IP.
2. **Reverse proxy:**
   - nginx: copy `deploy/nginx/mcvc.conf`, set your domain, `nginx -t && systemctl reload nginx`, then run certbot.
   - Caddy: merge `deploy/Caddyfile`. Caddy also issues certificates automatically for store custom domains once the platform has verified them.
3. **Backups:** add `deploy/backup.sh` to cron, and test a restore regularly.

On first start the API container applies migrations and creates the super admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Sign in at `https://<your domain>/login`.
