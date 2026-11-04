'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink, Card, Empty, Input, PageHeader, StatusBadge, Table, Td, cx } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { date } from '@/lib/format';

interface Job { id: string; jobNumber: string; status: string; reportedProblem: string; createdAt: string; estimatedDelivery: string | null; customer: { name: string; phone: string }; device: { brand: string; model: string; category: string }; technician: { name: string } | null }
const FILTERS = [['', 'Active', 'true'], ['WAITING_FOR_APPROVAL', 'Awaiting approval'], ['READY', 'Ready'], ['DELIVERED', 'Delivered'], ['', 'All', '']] as const;

export default function Repairs() {
  const [f, setF] = useState(0);
  const [q, setQ] = useState('');
  const [status, , active] = FILTERS[f];
  const { data } = useApi<{ total: number; items: Job[] }>(`/repair-jobs?pageSize=100${status ? `&status=${status}` : ''}${active ? `&active=${active}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  return (
    <>
      <PageHeader title="Repair jobs" subtitle="Job cards from intake to delivery" actions={<ButtonLink href="/erp/repairs/new">New job card</ButtonLink>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          {FILTERS.map(([, l], i) => <button key={l} onClick={() => setF(i)} className={cx('rounded-full px-3 py-1.5 text-xs font-medium', f === i ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{l}</button>)}
          <Input placeholder="Job no., customer, phone or device serial" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
        </div>
        {data?.items.length ? (
          <Table head={['Job card', 'Customer', 'Device', 'Problem', 'Technician', 'Due', 'Status']}>
            {data.items.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <Td><Link href={`/erp/repairs/${j.id}`} className="font-medium text-brand">{j.jobNumber}</Link><span className="block text-xs text-slate-500">{date(j.createdAt)}</span></Td>
                <Td>{j.customer.name}<span className="block text-xs text-slate-500">{j.customer.phone}</span></Td>
                <Td>{j.device.brand} {j.device.model}<span className="block text-xs text-slate-500">{j.device.category}</span></Td>
                <Td className="max-w-[200px] truncate">{j.reportedProblem}</Td>
                <Td>{j.technician?.name ?? '—'}</Td>
                <Td>{j.estimatedDelivery ? date(j.estimatedDelivery) : '—'}</Td>
                <Td><StatusBadge status={j.status} /></Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon="wrench" title={data ? 'No repair jobs here' : 'Loading…'} />
        )}
      </Card>
    </>
  );
}
