'use client';

import Link from 'next/link';
import { use } from 'react';
import { Badge, Card, PageHeader, Skeleton, Stat, StatusBadge, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { date, dateTime, label, money } from '@/lib/format';

interface Profile {
  id: string; name: string; phone: string; email: string | null; gstin: string | null; marketingConsent: boolean;
  stats: { lifetimeValue: string; outstanding: string; invoiceCount: number; isRepeat: boolean };
  invoices: { id: string; invoiceNumber: string; docType: string; issuedAt: string; grandTotal: string; paymentStatus: string; status: string }[];
  repairJobs: { id: string; jobNumber: string; status: string; createdAt: string; device: { brand: string; model: string } }[];
  bookings: { id: string; reference: string; slotStart: string; status: string; service: { name: string } | null }[];
}

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: c } = useApi<Profile>(`/customers/${id}`);
  if (!c) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHeader title={c.name} subtitle={<>{c.phone}{c.email && ` · ${c.email}`}{c.gstin && ` · GSTIN ${c.gstin}`} {c.stats.isRepeat && <Badge tone="green">Repeat customer</Badge>} {c.marketingConsent && <Badge tone="blue">Marketing consent</Badge>}</>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon="chart" label="Lifetime value" value={money(c.stats.lifetimeValue, true)} />
        <Stat icon="receipt" label="Outstanding" value={money(c.stats.outstanding, true)} tone="amber" />
        <Stat icon="wrench" label="Repair jobs" value={c.repairJobs.length} tone="violet" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Purchase & payment history">
          <Table head={['Number', 'Date', 'Total', 'Status']}>
            {c.invoices.map((i) => <tr key={i.id}><Td><Link className="text-brand" href={`/erp/invoices/${i.id}`}>{i.invoiceNumber}</Link> <span className="text-xs text-slate-500">{label(i.docType)}</span></Td><Td>{date(i.issuedAt)}</Td><Td>{money(i.grandTotal)}</Td><Td><StatusBadge status={i.status === 'CANCELLED' ? 'CANCELLED' : i.paymentStatus} /></Td></tr>)}
          </Table>
        </Card>
        <Card title="Repair history">
          <Table head={['Job', 'Device', 'Date', 'Status']}>
            {c.repairJobs.map((j) => <tr key={j.id}><Td><Link className="text-brand" href={`/erp/repairs/${j.id}`}>{j.jobNumber}</Link></Td><Td>{j.device.brand} {j.device.model}</Td><Td>{date(j.createdAt)}</Td><Td><StatusBadge status={j.status} /></Td></tr>)}
          </Table>
        </Card>
        <Card title="Bookings">
          <Table head={['Ref', 'Service', 'Slot', 'Status']}>
            {c.bookings.map((b) => <tr key={b.id}><Td>{b.reference}</Td><Td>{b.service?.name ?? '—'}</Td><Td>{dateTime(b.slotStart)}</Td><Td><StatusBadge status={b.status} /></Td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
