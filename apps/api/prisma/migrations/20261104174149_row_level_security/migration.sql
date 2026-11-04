-- Row-Level Security: second layer of tenant isolation.
--
-- Every tenant-owned table only exposes rows whose "storeId" matches the
-- transaction-local setting `app.store_id`, which the API sets via
-- set_config(..., true) at the start of each tenant transaction (TenantDb.run).
-- Platform jobs that legitimately need cross-tenant access (network analytics,
-- notification workers) set `app.bypass_rls = 'on'` explicitly (TenantDb.platform).
--
-- FORCE is used so the policies also apply to the table owner. Superusers always
-- bypass RLS, so the application must never connect as a superuser.

ALTER TABLE "document_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "document_sequences"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "customers"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "leads"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "product_categories"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "products"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "product_serials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_serials" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "product_serials"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "inventory_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_locations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_locations"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stock_movements"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "suppliers"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_orders"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "purchase_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_items"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoice_items"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "services"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "employees"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "booking_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_slots" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "booking_slots"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bookings"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "repair_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_devices" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "repair_devices"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "repair_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "repair_jobs"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "job_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_updates" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "job_updates"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "job_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_parts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "job_parts"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notifications"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "storeId"::text = current_setting('app.store_id', true));


-- Integrity rules that Prisma cannot express.
-- A technician cannot hold two active bookings in the same slot.
CREATE UNIQUE INDEX "bookings_technician_slot_active_key"
  ON "bookings" ("storeId", "technicianId", "slotStart")
  WHERE "technicianId" IS NOT NULL AND "status" NOT IN ('CANCELLED', 'NO_SHOW');

-- Slot counters can never be overbooked.
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_capacity_check" CHECK ("booked" >= 0 AND "booked" <= "capacity");

-- Stock can never go negative.
ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative" CHECK ("stockOnHand" >= 0);

-- Only one primary domain per store.
CREATE UNIQUE INDEX "store_domains_one_primary_key" ON "store_domains" ("storeId") WHERE "isPrimary";

-- Payments and stock movements are append-only ledgers.
CREATE OR REPLACE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; record a reversal instead', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_append_only BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();
CREATE TRIGGER stock_movements_append_only BEFORE UPDATE OR DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();
