'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';

interface City { id: string; name: string; state: string; stateCode: string; isActive: boolean; zone: string | null; associationName: string | null; associationCode: string | null; _count: { stores: number }; areas: { id: string; name: string; postalCode: string | null; _count: { stores: number } }[] }

export default function Cities() {
  const toast = useToast();
  const { data, reload } = useApi<City[]>('/master/cities');
  const [error, setError] = useState('');
  const submit = (path: string, ok: string) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries([...new FormData(form)].filter(([, v]) => v !== ''));
    try { await apiFetch(path, { method: 'POST', body }); toast(ok); form.reset(); setError(''); void reload(); } catch (err) { setError(errorText(err)); }
  };
  return (
    <>
      <PageHeader title="Cities & areas" subtitle="Locations used for store enrolment, discovery and manager scope." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {data?.map((c) => (
            <Card key={c.id} title={<span className="flex items-center gap-2">{c.name} <span className="font-normal text-slate-500">{c.zone ?? c.state} · GST {c.stateCode}{c.associationCode ? ` · ${c.associationCode}` : ''}</span> <Badge>{c._count.stores} stores</Badge></span>}>
              <div className="flex flex-wrap gap-2 p-4">
                {c.areas.length ? c.areas.map((a) => <Badge key={a.id} tone="blue">{a.name}{a.postalCode && ` · ${a.postalCode}`} · {a._count.stores}</Badge>) : <span className="text-sm text-slate-500">No areas yet</span>}
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card title="Add city">
            <form onSubmit={submit('/master/cities', 'City created')} className="space-y-3 p-4">
              <Field label="City name"><Input name="name" required /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="State"><Input name="state" defaultValue="Gujarat" required /></Field><Field label="GST state code"><Input name="stateCode" defaultValue="24" pattern="\d{2}" required /></Field></div>
              <Button className="w-full">Create city</Button>
            </form>
          </Card>
          <Card title="Add area / locality">
            <form onSubmit={submit('/master/areas', 'Area created')} className="space-y-3 p-4">
              <Field label="City"><Select name="cityId" required>{data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Area name"><Input name="name" required /></Field>
              <Field label="PIN code"><Input name="postalCode" pattern="\d{6}" /></Field>
              <Button className="w-full">Create area</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
