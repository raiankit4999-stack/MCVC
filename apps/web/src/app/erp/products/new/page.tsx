'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { apiFetch, errorText } from '@/lib/client-api';
import { useStore } from '../../context';

export default function NewProduct() {
  const { store } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [serialized, setSerialized] = useState(false);
  const [error, setError] = useState('');
  const rates = store.settings.allowedGstRates.map(Number);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const num = (k: string) => (f[k] ? Number(f[k]) : undefined);
    const specs = Object.fromEntries(['processor', 'ram', 'storage', 'graphics', 'screenSize', 'os'].filter((k) => f[k]).map((k) => [k, f[k]]));
    const serials = (f.serials ?? '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean).map((serialNumber) => ({ serialNumber }));
    try {
      const p = await apiFetch<{ id: string }>('/products', {
        method: 'POST',
        body: {
          name: f.name, sku: f.sku, barcode: f.barcode || undefined, brand: f.brand || undefined, modelNumber: f.modelNumber || undefined, categoryName: f.categoryName || undefined,
          description: f.description || undefined, hsnCode: f.hsnCode, gstRate: Number(f.gstRate), mrp: num('mrp'), purchasePrice: num('purchasePrice'), sellingPrice: num('sellingPrice'),
          warrantyMonths: num('warrantyMonths') ?? 0, reorderLevel: num('reorderLevel') ?? 0, condition: f.condition, isSerialized: serialized, specs,
          openingStock: serialized ? serials.length : num('openingStock') ?? 0, serials: serialized ? serials : [],
        },
      });
      toast('Product created');
      router.push(`/erp/products/${p.id}`);
    } catch (err) { setError(errorText(err)); }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <PageHeader title="Add product" actions={<Button>Save product</Button>} />
      {error && <Alert>{error}</Alert>}
      <Card title="Basics"><div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Product name" className="sm:col-span-2"><Input name="name" required /></Field>
        <Field label="Category"><Input name="categoryName" placeholder="Laptops" list="cats" /></Field>
        <Field label="SKU"><Input name="sku" required /></Field>
        <Field label="Barcode"><Input name="barcode" /></Field>
        <Field label="Brand"><Input name="brand" /></Field>
        <Field label="Model number"><Input name="modelNumber" /></Field>
        <Field label="Condition"><Select name="condition">{['NEW', 'REFURBISHED', 'OPEN_BOX', 'USED'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Warranty (months)"><Input name="warrantyMonths" type="number" min={0} defaultValue={12} /></Field>
        <Field label="Description" className="sm:col-span-3"><Textarea name="description" /></Field>
      </div></Card>
      <Card title="Pricing & tax"><div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="MRP ₹"><Input name="mrp" type="number" step="0.01" min={0} required /></Field>
        <Field label="Purchase price ₹"><Input name="purchasePrice" type="number" step="0.01" min={0} required /></Field>
        <Field label="Selling price ₹ (excl. GST)"><Input name="sellingPrice" type="number" step="0.01" min={0} required /></Field>
        <Field label="HSN code"><Input name="hsnCode" required pattern="\d{4,8}" placeholder="8471" /></Field>
        <Field label="GST rate" hint="Rates enabled for your store — confirm with your tax adviser"><Select name="gstRate" defaultValue={rates.includes(18) ? 18 : rates[0]}>{rates.map((r) => <option key={r} value={r}>{r}%</option>)}</Select></Field>
        <Field label="Reorder level"><Input name="reorderLevel" type="number" min={0} defaultValue={2} /></Field>
      </div></Card>
      <Card title="Computer specifications"><div className="grid gap-4 p-5 sm:grid-cols-3">
        {[['processor', 'Processor'], ['ram', 'RAM'], ['storage', 'Storage'], ['graphics', 'Graphics'], ['screenSize', 'Screen size'], ['os', 'Operating system']].map(([k, l]) => <Field key={k} label={l}><Input name={k} /></Field>)}
      </div></Card>
      <Card title="Stock"><div className="grid gap-4 p-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serialized} onChange={(e) => setSerialized(e.target.checked)} className="rounded border-slate-300 text-brand" /> Track individual serial numbers / IMEI (laptops, desktops, phones)</label>
        {serialized ? (
          <Field label="Serial numbers in stock" hint="One per line, or scan them in one after another"><Textarea name="serials" rows={4} /></Field>
        ) : (
          <Field label="Opening stock" className="max-w-xs"><Input name="openingStock" type="number" min={0} defaultValue={0} /></Field>
        )}
      </div></Card>
    </form>
  );
}
