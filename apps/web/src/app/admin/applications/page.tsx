'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Button, Card, Empty, PageHeader, StatusBadge, Table, Td, cx } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { date } from '@/lib/format';

interface App { id: string; businessName: string; ownerName: string; phone: string; email: string; gstin: string | null; addressLine: string; cityName: string; areaName: string; createdAt: string; status: string; reviewNote: string | null; plan: { name: string } }

export default function Applications() {
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const { data, reload } = useApi<{ total: number; items: App[] }>(`/master/applications?pageSize=100${status ? `&status=${status}` : ''}`);
  const decide = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    const note = decision === 'REJECT' ? prompt('Reason shared with the applicant') ?? undefined : undefined;
    try { await apiFetch(`/master/applications/${id}/decision`, { method: 'PATCH', body: { decision, note } }); toast(decision === 'APPROVE' ? 'Store provisioned' : 'Rejected'); void reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <>
      <PageHeader title="Store applications" subtitle="Approving an application provisions the store workspace. Subscription billing is managed separately." />
      <Card>
        <div className="flex gap-2 border-b border-slate-100 p-4">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => <button key={s} onClick={() => setStatus(s)} className={cx('rounded-full px-3 py-1.5 text-xs font-medium', status === s ? 'bg-ink text-white' : 'bg-slate-100 text-slate-700')}>{s ? s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'All'}</button>)}
        </div>
        {data?.items.length ? (
          <Table head={['Business', 'Owner', 'Location', 'GSTIN', 'Plan', 'Applied', 'Status', '']}>
            {data.items.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.businessName}</Td>
                <Td>{a.ownerName}<span className="block text-xs text-slate-500">{a.phone} · {a.email}</span></Td>
                <Td>{a.areaName}, {a.cityName}</Td><Td className="font-mono text-xs">{a.gstin ?? '—'}</Td><Td>{a.plan.name}</Td><Td>{date(a.createdAt)}</Td><Td><StatusBadge status={a.status} /></Td>
                <Td>{a.status === 'PENDING' && <div className="flex gap-2"><Button size="sm" variant="success" onClick={() => decide(a.id, 'APPROVE')}>Approve</Button><Button size="sm" variant="ghost" onClick={() => decide(a.id, 'REJECT')}>Reject</Button></div>}</Td>
              </tr>
            ))}
          </Table>
        ) : <Empty icon="file" title={data ? 'Nothing here' : 'Loading…'} />}
      </Card>
    </>
  );
}
