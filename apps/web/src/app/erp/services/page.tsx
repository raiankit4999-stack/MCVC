'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Table, Td, Textarea } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { money } from '@/lib/format';

interface S { id: string; name: string; description: string | null; price: string; priceIsStarting: boolean; gstRate: string; sacCode: string; durationMinutes: number; isBookable: boolean; isPublished: boolean }

export default function Services() {
  const toast = useToast();
  const { data, reload } = useApi<S[]>('/services');
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      await apiFetch('/services', { method: 'POST', body: { name: f.name, description: f.description || undefined, price: Number(f.price), gstRate: Number(f.gstRate), sacCode: f.sacCode, durationMinutes: Number(f.durationMinutes), isBookable: f.isBookable === 'on' } });
      toast('Service added');
      form.reset();
      setError('');
      void reload();
    } catch (err) { setError(errorText(err)); }
  }
  return (
    <>
      <PageHeader title="Service catalogue" subtitle="Services appear on your website and can be booked by customers." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <Table head={['Service', 'Price', 'GST', 'SAC', 'Duration', '']}>
            {data?.map((s) => (
              <tr key={s.id}>
                <Td><span className="font-medium">{s.name}</span>{s.description && <span className="block max-w-xs truncate text-xs text-slate-500">{s.description}</span>}</Td>
                <Td>{s.priceIsStarting && 'from '}{money(s.price, true)}</Td><Td>{Number(s.gstRate)}%</Td><Td>{s.sacCode}</Td><Td>{s.durationMinutes} min</Td>
                <Td>{s.isBookable ? <Badge tone="green">Bookable</Badge> : <Badge>Enquiry only</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Add service">
          <form onSubmit={submit} className="space-y-3 p-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Description"><Textarea name="description" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starting price ₹"><Input name="price" type="number" min={0} step="0.01" required /></Field>
              <Field label="GST %"><Input name="gstRate" type="number" step="0.01" defaultValue={18} /></Field>
              <Field label="SAC"><Input name="sacCode" defaultValue="998713" /></Field>
              <Field label="Duration (min)"><Input name="durationMinutes" type="number" defaultValue={60} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isBookable" defaultChecked /> Customers can book online</label>
            <Button className="w-full">Add service</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
