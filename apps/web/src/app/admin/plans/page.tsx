'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, Card, Field, Input, PageHeader } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { money } from '@/lib/format';

interface Plan { id: string; code: string; name: string; description: string | null; priceMonthly: string; priceYearly: string; features: string[]; isActive: boolean; _count: { subscriptions: number } }

export default function Plans() {
  const toast = useToast();
  const { data, reload } = useApi<Plan[]>('/master/membership-plans');
  const [error, setError] = useState('');
  const save = (id: string) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await apiFetch(`/master/membership-plans/${id}`, { method: 'PATCH', body: { priceMonthly: Number(f.priceMonthly), priceYearly: Number(f.priceYearly), description: f.description } });
      toast('Plan updated'); setError(''); void reload();
    } catch (err) { setError(errorText(err)); }
  };
  return (
    <>
      <PageHeader title="Membership plans" subtitle="Pricing is configuration — changes apply to new subscriptions and renewals." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data?.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-ink">{p.name}</h2><Badge>{p._count.subscriptions} stores</Badge></div>
            <p className="mt-1 text-2xl font-bold">{money(p.priceMonthly, true)}<span className="text-xs font-normal text-slate-500">/mo</span></p>
            <div className="mt-2 flex flex-wrap gap-1">{p.features.map((f) => <Badge key={f} tone="blue">{f}</Badge>)}</div>
            <form onSubmit={save(p.id)} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-2"><Field label="Monthly ₹"><Input name="priceMonthly" type="number" defaultValue={Number(p.priceMonthly)} /></Field><Field label="Yearly ₹"><Input name="priceYearly" type="number" defaultValue={Number(p.priceYearly)} /></Field></div>
              <Field label="Description"><Input name="description" defaultValue={p.description ?? ''} /></Field>
              <Button size="sm" variant="secondary" className="w-full">Save</Button>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
