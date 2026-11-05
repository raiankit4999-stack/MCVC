'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Stat, Table, Td } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { dateTime, label, money } from '@/lib/format';

interface Inv { totals: { products: number; units: number; valuationAtCost: string; lowStock: number }; items: { id: string; name: string; sku: string; stockOnHand: number; reorderLevel: number; isSerialized: boolean }[] }
interface Mv { id: string; movementType: string; quantity: number; note: string | null; createdAt: string; product: { name: string } }
interface Supplier { id: string; name: string }
interface Po { id: string; number: string; status: string; total: string; createdAt: string; supplier: { name: string } }

export default function Inventory() {
  const toast = useToast();
  const inv = useApi<Inv>('/inventory');
  const mv = useApi<Mv[]>('/inventory/movements?pageSize=25');
  const suppliers = useApi<Supplier[]>('/suppliers');
  const pos = useApi<Po[]>('/purchases');
  const [error, setError] = useState('');

  async function adjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      await apiFetch('/inventory/adjustments', { method: 'POST', body: { productId: f.productId, quantity: Number(f.quantity), type: f.type, reason: f.reason } });
      toast('Stock adjusted');
      form.reset();
      void inv.reload(); void mv.reload();
      setError('');
    } catch (err) { setError(errorText(err)); }
  }
  async function purchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      let supplierId = f.supplierId;
      if (!supplierId && f.newSupplier) supplierId = (await apiFetch<Supplier>('/suppliers', { method: 'POST', body: { name: f.newSupplier } })).id;
      const serials = (f.serials ?? '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      await apiFetch('/purchases', { method: 'POST', body: { supplierId, supplierInvoiceNo: f.invoiceNo || undefined, receiveNow: true, items: [{ productId: f.productId, quantity: Number(f.quantity), unitCost: Number(f.unitCost), gstRate: Number(f.gstRate), serials }] } });
      toast('Purchase received — stock updated');
      form.reset();
      void inv.reload(); void mv.reload(); void pos.reload(); void suppliers.reload();
    } catch (err) { setError(errorText(err)); }
  }

  const productOptions = inv.data?.items.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stockOnHand})</option>);
  return (
    <>
      <PageHeader title="Stock & purchases" />
      {inv.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat icon="box" label="Products" value={inv.data.totals.products} />
          <Stat icon="layers" label="Units in stock" value={inv.data.totals.units} tone="violet" />
          <Stat icon="tag" label="Valuation at cost" value={money(inv.data.totals.valuationAtCost, true)} tone="green" />
          <Stat icon="bell" label="Low stock items" value={inv.data.totals.lowStock} tone="amber" />
        </div>
      )}
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Receive purchase (GRN)">
          <form onSubmit={purchase} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <Field label="Supplier"><Select name="supplierId"><option value="">New supplier →</option>{suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="New supplier name"><Input name="newSupplier" /></Field>
            <Field label="Product" className="sm:col-span-2"><Select name="productId" required>{productOptions}</Select></Field>
            <Field label="Quantity"><Input name="quantity" type="number" min={1} required /></Field>
            <Field label="Unit cost ₹"><Input name="unitCost" type="number" step="0.01" min={0} required /></Field>
            <Field label="GST %"><Input name="gstRate" type="number" step="0.01" defaultValue={18} /></Field>
            <Field label="Supplier invoice no."><Input name="invoiceNo" /></Field>
            <Field label="Serial numbers (serialized products)" className="sm:col-span-2"><Input name="serials" placeholder="Comma separated" /></Field>
            <Button className="sm:col-span-2">Receive stock</Button>
          </form>
        </Card>
        <Card title="Stock adjustment">
          <form onSubmit={adjust} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <Field label="Product" className="sm:col-span-2"><Select name="productId" required>{productOptions}</Select></Field>
            <Field label="Quantity (+/−)"><Input name="quantity" type="number" required /></Field>
            <Field label="Type"><Select name="type"><option value="ADJUSTMENT">Audit adjustment</option><option value="DAMAGED">Damaged</option></Select></Field>
            <Field label="Reason" className="sm:col-span-2"><Input name="reason" required minLength={3} /></Field>
            <Button variant="secondary" className="sm:col-span-2">Post adjustment</Button>
          </form>
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Recent stock movements">
          <Table head={['When', 'Product', 'Movement', 'Qty']}>
            {mv.data?.map((m) => <tr key={m.id}><Td>{dateTime(m.createdAt)}</Td><Td>{m.product.name}</Td><Td><Badge tone={m.quantity > 0 ? 'green' : 'amber'}>{label(m.movementType)}</Badge></Td><Td className="font-medium">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td></tr>)}
          </Table>
        </Card>
        <Card title="Purchase orders">
          <Table head={['Number', 'Supplier', 'Total', 'Status']}>
            {pos.data?.map((p) => <tr key={p.id}><Td className="font-medium">{p.number}</Td><Td>{p.supplier.name}</Td><Td>{money(p.total)}</Td><Td><Badge tone={p.status === 'RECEIVED' ? 'green' : 'blue'}>{label(p.status)}</Badge></Td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
