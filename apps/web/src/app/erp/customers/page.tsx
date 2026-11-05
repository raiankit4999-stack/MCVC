'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Button, Card, Empty, Field, Input, PageHeader, Table, Td } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { date } from '@/lib/format';

interface C { id: string; name: string; phone: string; email: string | null; createdAt: string; _count: { invoices: number; repairJobs: number } }

export default function Customers() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const { data, reload } = useApi<{ total: number; items: C[] }>(`/customers?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await apiFetch('/customers', { method: 'POST', body: { name: f.name, phone: f.phone, email: f.email || undefined, gstin: f.gstin || undefined, marketingConsent: f.consent === 'on' } });
      toast('Customer added');
      setShow(false);
      void reload();
    } catch (err) { setError(errorText(err)); }
  }
  return (
    <>
      <PageHeader title="Customers" subtitle={data ? `${data.total} customers` : undefined} actions={<Button onClick={() => setShow(!show)}>Add customer</Button>} />
      {show && (
        <Card className="mb-6 p-4">
          <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
            {error && <div className="sm:col-span-5"><Alert>{error}</Alert></div>}
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Mobile"><Input name="phone" required /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="GSTIN"><Input name="gstin" /></Field>
            <Button>Save</Button>
            <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-5"><input type="checkbox" name="consent" /> Customer agreed to receive offers (marketing consent)</label>
          </form>
        </Card>
      )}
      <Card>
        <div className="border-b border-slate-100 p-4"><Input placeholder="Name, phone, email, invoice no. or device serial" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>
        {data?.items.length ? (
          <Table head={['Customer', 'Phone', 'Email', 'Invoices', 'Repairs', 'Since']}>
            {data.items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td><Link href={`/erp/customers/${c.id}`} className="font-medium text-brand">{c.name}</Link></Td>
                <Td>{c.phone}</Td><Td>{c.email ?? '—'}</Td><Td>{c._count.invoices}</Td><Td>{c._count.repairJobs}</Td><Td>{date(c.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        ) : <Empty icon="users" title={data ? 'No customers found' : 'Loading…'} />}
      </Card>
    </>
  );
}
