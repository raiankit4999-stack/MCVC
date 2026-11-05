'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Alert, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { apiFetch, errorText } from '@/lib/client-api';
import { money } from '@/lib/format';
import { useStore } from '../context';

interface Product { id: string; name: string; sku: string; sellingPrice: string; gstRate: string; hsnCode: string; stockOnHand: number; isSerialized: boolean; serials?: { serialNumber: string; status: string }[] }
interface Service { id: string; name: string; price: string; gstRate: string; sacCode: string }
interface Line { key: string; productId?: string; serviceId?: string; description: string; quantity: number; unitPrice: number; discount: number; gstRate: number; serialized: boolean; serialNumbers: string[]; available?: string[] }

/** Client-side estimate only; the API recomputes totals authoritatively. */
function estimate(lines: Line[], interState: boolean) {
  let taxable = 0, tax = 0;
  for (const l of lines) {
    const t = Math.round(l.quantity * l.unitPrice * 100) - Math.round(l.discount * 100);
    taxable += t;
    tax += Math.round((t * Math.round(l.gstRate * 100)) / 10000);
  }
  const exact = taxable + tax;
  return { taxable: taxable / 100, tax: tax / 100, half: tax / 200, total: Math.round(exact / 100), interState };
}

function Pos() {
  const { store } = useStore();
  const router = useRouter();
  const toast = useToast();
  const jobId = useSearchParams().get('repairJobId') ?? undefined;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [docType, setDocType] = useState(store.gstin ? 'TAX_INVOICE' : 'BILL_OF_SUPPLY');
  const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '' });
  const [pay, setPay] = useState({ amount: '', method: 'UPI', reference: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void apiFetch<Service[]>('/services').then(setServices);
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F2') { e.preventDefault(); search.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => void apiFetch<{ items: Product[] }>(`/products?q=${encodeURIComponent(q)}&pageSize=8`).then((r) => setResults(r.items)), 150);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!jobId) return;
    void apiFetch<{ customer: { name: string; phone: string; gstin: string | null } }>(`/repair-jobs/${jobId}`).then((j) => setCustomer({ name: j.customer.name, phone: j.customer.phone, gstin: j.customer.gstin ?? '' }));
  }, [jobId]);

  async function addProduct(p: Product) {
    setQ('');
    setResults([]);
    let available: string[] | undefined;
    if (p.isSerialized) {
      const full = await apiFetch<Product>(`/products/${p.id}`);
      available = (full.serials ?? []).filter((s) => s.status === 'IN_STOCK').map((s) => s.serialNumber);
    }
    setLines((ls) => [...ls, { key: crypto.randomUUID(), productId: p.id, description: p.name, quantity: 1, unitPrice: Number(p.sellingPrice), discount: 0, gstRate: Number(p.gstRate), serialized: p.isSerialized, serialNumbers: available?.[0] ? [available[0]] : [], available }]);
    search.current?.focus();
  }
  // Barcode scanners type the code and press Enter: add the exact match.
  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && results[0]) { e.preventDefault(); void addProduct(results[0]); }
  }
  const addService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) setLines((ls) => [...ls, { key: crypto.randomUUID(), serviceId: s.id, description: s.name, quantity: 1, unitPrice: Number(s.price), discount: 0, gstRate: Number(s.gstRate), serialized: false, serialNumbers: [] }]);
  };
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const interState = !!customer.gstin && customer.gstin.slice(0, 2) !== store.stateCode;
  const t = useMemo(() => estimate(lines.map((l) => (docType === 'BILL_OF_SUPPLY' ? { ...l, gstRate: 0 } : l)), interState), [lines, interState, docType]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const inv = await apiFetch<{ id: string; invoiceNumber: string }>('/invoices', {
        method: 'POST',
        body: {
          docType,
          repairJobId: jobId,
          customer: customer.phone ? { name: customer.name || 'Customer', phone: customer.phone, gstin: customer.gstin || undefined } : undefined,
          items: lines.map((l) => ({ productId: l.productId, serviceId: l.serviceId, description: l.productId || l.serviceId ? undefined : l.description, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount || undefined, serialNumbers: l.serialized ? l.serialNumbers : undefined })),
          payments: pay.amount && ['TAX_INVOICE', 'BILL_OF_SUPPLY'].includes(docType) ? [{ amount: Number(pay.amount), method: pay.method, reference: pay.reference || undefined }] : [],
        },
      });
      toast(`Created ${inv.invoiceNumber}`);
      router.push(`/erp/invoices/${inv.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="New sale" subtitle="F2 focuses search · scan a barcode and press Enter to add" actions={
        <Select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-48" aria-label="Document type">
          <option value="TAX_INVOICE" disabled={!store.gstin}>GST tax invoice</option>
          <option value="BILL_OF_SUPPLY">Bill of supply (non-GST)</option>
          <option value="QUOTATION">Quotation</option>
          <option value="PROFORMA">Proforma invoice</option>
        </Select>
      } />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input ref={search} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} placeholder="Search product name, SKU, barcode or serial…" className="pl-9" aria-label="Search products" />
              {results.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {results.map((p) => (
                    <li key={p.id}><button type="button" onClick={() => void addProduct(p)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-brand-50">
                      <span><span className="font-medium">{p.name}</span> <span className="text-xs text-slate-500">{p.sku}</span></span>
                      <span className="text-right"><span className="font-semibold">{money(p.sellingPrice)}</span><span className={`block text-xs ${p.stockOnHand ? 'text-slate-500' : 'text-danger'}`}>{p.stockOnHand} in stock</span></span>
                    </button></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {services.slice(0, 6).map((s) => <Button key={s.id} type="button" size="sm" variant="secondary" onClick={() => addService(s.id)}>+ {s.name}</Button>)}
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => [...ls, { key: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18, serialized: false, serialNumbers: [] }])}>+ Custom line</Button>
            </div>
          </Card>
          <Card>
            {lines.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">Add products or services to start the bill.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <div key={l.key} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_70px_110px_90px_70px_32px] sm:items-end">
                    <Field label="Item" className="col-span-2 sm:col-span-1">
                      {l.productId || l.serviceId ? <p className="py-2 text-sm font-medium">{l.description}</p> : <Input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} required placeholder="Description" />}
                    </Field>
                    <Field label="Qty"><Input type="number" min={1} value={l.quantity} disabled={l.serialized} onChange={(e) => update(l.key, { quantity: Number(e.target.value) })} /></Field>
                    <Field label="Price ₹"><Input type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: Number(e.target.value) })} /></Field>
                    <Field label="Discount ₹"><Input type="number" min={0} step="0.01" value={l.discount} onChange={(e) => update(l.key, { discount: Number(e.target.value) })} /></Field>
                    <Field label="GST %"><p className="py-2 text-sm">{docType === 'BILL_OF_SUPPLY' ? '—' : l.gstRate}</p></Field>
                    <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="mb-1 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-danger" aria-label="Remove line">✕</button>
                    {l.serialized && (
                      <Field label="Serial number" className="col-span-2 sm:col-span-6">
                        <Select value={l.serialNumbers[0] ?? ''} onChange={(e) => update(l.key, { serialNumbers: [e.target.value] })} required>
                          <option value="">Select serial</option>
                          {l.available?.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </Field>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Customer" className="p-0">
            <div className="grid gap-3 p-4">
              <Field label="Mobile"><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} inputMode="tel" placeholder="Walk-in if empty" /></Field>
              <Field label="Name"><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></Field>
              <Field label="Customer GSTIN (B2B)"><Input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} /></Field>
            </div>
          </Card>
          <Card title="Summary">
            <dl className="space-y-2 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Taxable value</dt><dd>{money(t.taxable)}</dd></div>
              {docType !== 'BILL_OF_SUPPLY' && (interState ? (
                <div className="flex justify-between"><dt className="text-slate-500">IGST</dt><dd>{money(t.tax)}</dd></div>
              ) : (
                <>
                  <div className="flex justify-between"><dt className="text-slate-500">CGST</dt><dd>{money(t.half)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">SGST</dt><dd>{money(t.half)}</dd></div>
                </>
              ))}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-900"><dt>Total</dt><dd>{money(t.total)}</dd></div>
            </dl>
            {['TAX_INVOICE', 'BILL_OF_SUPPLY'].includes(docType) && (
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4">
                <Field label="Received ₹"><Input type="number" min={0} step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder={String(t.total)} /></Field>
                <Field label="Method">
                  <Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                    {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </Select>
                </Field>
                <Button type="button" size="sm" variant="secondary" className="col-span-2" onClick={() => setPay({ ...pay, amount: String(t.total) })}>Paid in full</Button>
              </div>
            )}
            <div className="p-4 pt-0">
              {error && <div className="mb-3"><Alert>{error}</Alert></div>}
              <Button className="w-full" size="lg" disabled={busy || !lines.length}>{busy ? 'Saving…' : 'Create & print'}</Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">Totals are confirmed by the server on save.</p>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

export default function PosPage() {
  return <Suspense><Pos /></Suspense>;
}
