'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { Alert, Badge, Button, Card, Field, Input, Select, StatusBadge } from '@/components/ui';
import { apiFetch, errorText } from '@/lib/client-api';
import { money } from '@/lib/format';
import type { Area, Category, City, Plan } from '@/lib/types';

interface Application { id: string; businessName: string; status: string; createdAt: string; reviewNote: string | null; plan: { name: string } }

export default function JoinPage() {
  const [me, setMe] = useState<{ name: string; email: string; memberships: unknown[] } | null | undefined>(undefined);
  const [apps, setApps] = useState<Application[]>([]);

  const loadMe = async () => {
    try {
      setMe(await apiFetch('/auth/me', { store: false }));
      setApps(await apiFetch<Application[]>('/membership/applications/mine', { store: false }));
    } catch {
      setMe(null);
    }
  };
  useEffect(() => {
    void loadMe();
  }, []);

  const steps = ['Create account', 'Business details', 'Choose plan', 'Community review'];
  const current = me === null ? 0 : apps.length ? 3 : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Become a member</h1>
      <p className="mt-2 text-slate-600">Get your own branded store website, ERP and CRM, and be discovered by customers across the community.</p>
      <ol className="mt-8 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col gap-2">
            <span className={`h-1.5 rounded-full ${i <= current ? 'bg-brand' : 'bg-slate-200'}`} />
            <span className={`text-xs font-medium ${i === current ? 'text-brand' : 'text-slate-500'}`}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        {me === undefined ? null : me === null ? (
          <RegisterForm onDone={loadMe} />
        ) : apps.length ? (
          <ApplicationStatus apps={apps} hasStore={me.memberships.length > 0} />
        ) : (
          <ApplicationForm onDone={loadMe} defaults={me} />
        )}
      </div>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await apiFetch('/auth/register', { method: 'POST', body: f, store: false });
      onDone();
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <Card className="p-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <Field label="Owner name"><Input name="name" required minLength={2} /></Field>
        <Field label="Mobile number"><Input name="phone" required inputMode="tel" placeholder="98250 12345" /></Field>
        <Field label="Email"><Input name="email" type="email" required /></Field>
        <Field label="Password" hint="At least 10 characters"><Input name="password" type="password" required minLength={10} /></Field>
        <div className="flex items-center justify-between sm:col-span-2">
          <p className="text-sm text-slate-500">Already registered? <Link href="/login?next=/join" className="font-semibold text-brand">Sign in</Link></p>
          <Button>Continue</Button>
        </div>
      </form>
    </Card>
  );
}

function ApplicationForm({ onDone, defaults }: { onDone: () => void; defaults: { name: string; email: string } }) {
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [city, setCity] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([apiFetch<City[]>('/cities', { store: false }), apiFetch<Category[]>('/categories', { store: false }), apiFetch<Plan[]>('/membership/plans', { store: false })]).then(([c, k, p]) => {
      setCities(c);
      setCategories(k);
      setPlans(p);
      setPlan(p[1]?.id ?? p[0]?.id ?? '');
    });
  }, []);
  useEffect(() => {
    const c = cities.find((x) => x.id === city);
    if (c) void apiFetch<Area[]>(`/areas?city=${c.slug}`, { store: false }).then(setAreas);
  }, [city, cities]);
  const grouped = useMemo(() => ({ PRODUCT: categories.filter((c) => c.kind === 'PRODUCT'), SERVICE: categories.filter((c) => c.kind === 'SERVICE') }), [categories]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError('');
    try {
      await apiFetch('/membership/applications', { method: 'POST', store: false, body: { ...f, gstin: f.gstin || undefined, cityId: city, categoryIds: selected, planId: plan } });
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Card title="Business details" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Business name"><Input name="businessName" required /></Field>
          <Field label="Owner name"><Input name="ownerName" defaultValue={defaults.name} required /></Field>
          <Field label="Business phone"><Input name="phone" required inputMode="tel" /></Field>
          <Field label="Business email"><Input name="email" type="email" defaultValue={defaults.email} required /></Field>
          <Field label="GSTIN" hint="Optional — required to issue GST tax invoices"><Input name="gstin" placeholder="24ABCDE1234F1Z6" /></Field>
          <Field label="Address"><Input name="addressLine" required /></Field>
          <Field label="City">
            <Select value={city} onChange={(e) => setCity(e.target.value)} required>
              <option value="">Select city</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Area / locality">
            <Select name="areaId" required disabled={!city}>
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>
      <Card title="What does your business offer?">
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          {(['PRODUCT', 'SERVICE'] as const).map((k) => (
            <fieldset key={k}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{k === 'PRODUCT' ? 'Products' : 'Services'}</legend>
              <div className="flex flex-wrap gap-2">
                {grouped[k].map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <button type="button" key={c.id} onClick={() => setSelected((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${on ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`} aria-pressed={on}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </Card>
      <Card title="Membership plan">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <button type="button" key={p.id} onClick={() => setPlan(p.id)} className={`rounded-xl p-4 text-left ring-1 ring-inset transition ${plan === p.id ? 'bg-brand-50 ring-2 ring-brand' : 'ring-slate-200 hover:bg-slate-50'}`} aria-pressed={plan === p.id}>
              <p className="font-semibold text-ink">{p.name}</p>
              <p className="mt-1 text-lg font-bold">{money(p.priceMonthly, true)}<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">{p.description}</p>
            </button>
          ))}
        </div>
      </Card>
      <div className="flex justify-end">
        <Button size="lg" disabled={busy || !selected.length || !city}>{busy ? 'Submitting…' : 'Submit application'}</Button>
      </div>
    </form>
  );
}

function ApplicationStatus({ apps, hasStore }: { apps: Application[]; hasStore: boolean }) {
  const a = apps[0];
  return (
    <Card className="p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand"><Icon name={a.status === 'APPROVED' ? 'check' : 'clock'} className="h-7 w-7" /></span>
      <h2 className="mt-4 text-xl font-semibold text-ink">{a.businessName}</h2>
      <div className="mt-2 flex justify-center gap-2"><StatusBadge status={a.status} /><Badge>{a.plan.name}</Badge></div>
      <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
        {a.status === 'PENDING' && 'Your application is being reviewed by the community team. You will be notified once it is approved.'}
        {a.status === 'APPROVED' && 'Approved! Your store workspace is ready. Add your branding and products, then publish your website.'}
        {a.status === 'REJECTED' && (a.reviewNote ?? 'Your application was not approved.')}
      </p>
      {hasStore && <Link href="/erp" className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white">Open store dashboard</Link>}
    </Card>
  );
}
