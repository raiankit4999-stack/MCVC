'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Button, ButtonLink, Card, Empty, Input, PageHeader, StatusBadge } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { time, todayIst } from '@/lib/format';

interface B { id: string; reference: string; slotStart: string; status: string; deviceType: string | null; deviceModel: string | null; problem: string | null; pickupRequired: boolean; repairJobId: string | null; customer: { name: string; phone: string }; service: { name: string } | null; technician: { name: string } | null }

export default function Bookings() {
  const toast = useToast();
  const [day, setDay] = useState(todayIst());
  const { data, reload } = useApi<B[]>(`/bookings?from=${day}T00:00:00%2B05:30&to=${day}T23:59:59%2B05:30`);
  const pending = useApi<B[]>('/bookings?status=PENDING_CONFIRMATION');
  const update = async (id: string, status: string) => {
    try { await apiFetch(`/bookings/${id}`, { method: 'PATCH', body: { status } }); toast('Booking updated'); void reload(); void pending.reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  const shift = (d: number) => { const x = new Date(`${day}T12:00:00+05:30`); x.setDate(x.getDate() + d); setDay(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(x)); };

  const row = (b: B) => (
    <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="w-20"><p className="font-semibold">{time(b.slotStart)}</p><p className="text-xs text-slate-500">{b.reference}</p></div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{b.service?.name ?? 'Consultation'} — {b.customer.name} <span className="font-normal text-slate-500">{b.customer.phone}</span></p>
        <p className="truncate text-slate-500">{[b.deviceType, b.deviceModel, b.problem].filter(Boolean).join(' · ')}{b.pickupRequired && ' · Pickup requested'}</p>
      </div>
      <StatusBadge status={b.status} />
      <div className="flex gap-2">
        {['NEW', 'PENDING_CONFIRMATION', 'RESCHEDULED'].includes(b.status) && <Button size="sm" variant="success" onClick={() => update(b.id, 'CONFIRMED')}>Confirm</Button>}
        {['CONFIRMED', 'RESCHEDULED'].includes(b.status) && !b.repairJobId && <ButtonLink href={`/erp/repairs/new?bookingId=${b.id}`} variant="secondary" className="h-8 px-3 text-xs">Create job card</ButtonLink>}
        {b.repairJobId && <Link href={`/erp/repairs/${b.repairJobId}`} className="text-xs font-semibold text-brand">Job card →</Link>}
        {!['COMPLETED', 'CANCELLED', 'NO_SHOW', 'IN_PROGRESS'].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => update(b.id, 'CANCELLED')}>Cancel</Button>}
      </div>
    </li>
  );

  return (
    <>
      <PageHeader title="Bookings" subtitle="Online and walk-in appointments" />
      {pending.data && pending.data.length > 0 && (
        <Card title={`Awaiting confirmation (${pending.data.length})`} className="mb-6"><ul className="divide-y divide-slate-100">{pending.data.map(row)}</ul></Card>
      )}
      <Card title={new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} action={
        <div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={() => shift(-1)} aria-label="Previous day">‹</Button><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-8 w-40" /><Button size="sm" variant="secondary" onClick={() => shift(1)} aria-label="Next day">›</Button></div>
      }>
        {data?.length ? <ul className="divide-y divide-slate-100">{data.map(row)}</ul> : <Empty icon="calendar" title={data ? 'No bookings for this day' : 'Loading…'} />}
      </Card>
    </>
  );
}
