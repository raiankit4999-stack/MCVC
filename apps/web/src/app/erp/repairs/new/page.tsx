'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea, cx } from '@/components/ui';
import { apiFetch, errorText } from '@/lib/client-api';

const CATEGORIES = ['Laptop', 'Desktop', 'All-in-one', 'Printer', 'Monitor', 'Tablet', 'Other'];
const ACCESSORIES = ['Charger', 'Bag', 'Battery', 'Mouse', 'Keyboard', 'Power cable', 'HDD/SSD', 'Box'];

function Intake() {
  const router = useRouter();
  const toast = useToast();
  const bookingId = useSearchParams().get('bookingId') ?? undefined;
  const [category, setCategory] = useState('Laptop');
  const [acc, setAcc] = useState<string[]>(['Charger']);
  const [techs, setTechs] = useState<{ id: string; name: string; isTechnician: boolean }[]>([]);
  const [prefill, setPrefill] = useState<{ name: string; phone: string; model: string; problem: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiFetch<{ id: string; name: string; isTechnician: boolean }[]>('/store/employees').then((e) => setTechs(e.filter((x) => x.isTechnician))).catch(() => undefined);
    if (bookingId) void apiFetch<{ customer: { name: string; phone: string }; deviceModel: string | null; problem: string | null }>(`/bookings/${bookingId}`).then((b) => setPrefill({ name: b.customer.name, phone: b.customer.phone, model: b.deviceModel ?? '', problem: b.problem ?? '' }));
  }, [bookingId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      const job = await apiFetch<{ id: string; jobNumber: string; trackingToken: string }>('/repair-jobs', {
        method: 'POST',
        body: {
          customer: { name: f.name, phone: f.phone, email: f.email || undefined },
          device: { category, brand: f.brand, model: f.model, serialNumber: f.serialNumber || undefined },
          reportedProblem: f.problem, physicalCondition: f.condition || undefined, accessories: acc,
          technicianId: f.technicianId || undefined, estimatedDelivery: f.estimatedDelivery || undefined, estimateAmount: f.estimate ? Number(f.estimate) : undefined, bookingId,
        },
      });
      try { sessionStorage.setItem(`track:${job.id}`, job.trackingToken); } catch { /* ignore */ }
      toast(`Job card ${job.jobNumber} created`);
      router.push(`/erp/repairs/${job.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (bookingId && !prefill) return null;
  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <PageHeader title="New job card" subtitle="Device intake — keep it quick; details can be added during diagnosis." actions={<Button disabled={busy}>{busy ? 'Saving…' : 'Create job card'}</Button>} />
      {error && <Alert>{error}</Alert>}
      <Card title="Customer"><div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Mobile"><Input name="phone" required inputMode="tel" defaultValue={prefill?.phone} autoFocus /></Field>
        <Field label="Name"><Input name="name" required defaultValue={prefill?.name} /></Field>
        <Field label="Email"><Input name="email" type="email" /></Field>
      </div></Card>
      <Card title="Device"><div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Device category">
          {CATEGORIES.map((c) => <button type="button" role="radio" aria-checked={category === c} key={c} onClick={() => setCategory(c)} className={cx('rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset', category === c ? 'bg-brand text-white ring-brand' : 'ring-slate-200 hover:bg-slate-50')}>{c}</button>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Brand"><Input name="brand" required list="brands" /></Field>
          <Field label="Model"><Input name="model" required defaultValue={prefill?.model} /></Field>
          <Field label="Serial number"><Input name="serialNumber" /></Field>
        </div>
        <datalist id="brands">{['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'MSI', 'Samsung', 'Canon', 'Epson'].map((b) => <option key={b} value={b} />)}</datalist>
        <Field label="Reported problem"><Textarea name="problem" required defaultValue={prefill?.problem} /></Field>
        <Field label="Physical condition" hint="Scratches, dents, screen/body damage"><Input name="condition" /></Field>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-slate-700">Accessories received</legend>
          <div className="flex flex-wrap gap-2">
            {ACCESSORIES.map((a) => { const on = acc.includes(a); return <button type="button" key={a} aria-pressed={on} onClick={() => setAcc((x) => (on ? x.filter((y) => y !== a) : [...x, a]))} className={cx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', on ? 'bg-navy text-white ring-navy' : 'ring-slate-200')}>{a}</button>; })}
          </div>
        </fieldset>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Do not record device passwords or PINs. Ask the customer to sign in during diagnosis if needed.</p>
      </div></Card>
      <Card title="Assignment"><div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Technician"><Select name="technicianId"><option value="">Unassigned</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Estimated delivery"><Input name="estimatedDelivery" type="date" /></Field>
        <Field label="Initial estimate ₹"><Input name="estimate" type="number" min={0} step="0.01" /></Field>
      </div></Card>
    </form>
  );
}

export default function NewRepair() {
  return <Suspense><Intake /></Suspense>;
}
