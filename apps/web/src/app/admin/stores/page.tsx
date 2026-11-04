'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Empty, Input, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { date } from '@/lib/format';

interface S { id: string; name: string; slug: string; membershipStatus: string; websiteStatus: string; isVerified: boolean; isFeatured: boolean; createdAt: string; city: { name: string }; area: { name: string }; subscriptions: { status: string; currentPeriodEnd: string; plan: { name: string } }[]; domains: { hostname: string; verificationStatus: string }[] }

export default function Stores() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const { data, reload } = useApi<{ total: number; items: S[] }>(`/master/stores?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const patch = async (id: string, body: Record<string, unknown>, msg: string) => {
    try { await apiFetch(`/master/stores/${id}/status`, { method: 'PATCH', body }); toast(msg); void reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <>
      <PageHeader title="Stores" subtitle={data ? `${data.total} member stores` : undefined} />
      <Card>
        <div className="border-b border-slate-100 p-4"><Input placeholder="Search stores" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" /></div>
        {data?.items.length ? (
          <Table head={['Store', 'Location', 'Plan', 'Membership', 'Website', 'Domains', 'Joined', '']}>
            {data.items.map((s) => {
              const sub = s.subscriptions[0];
              return (
                <tr key={s.id}>
                  <Td><span className="font-medium">{s.name}</span> {s.isVerified && <Badge tone="blue">Verified</Badge>} {s.isFeatured && <Badge tone="violet">Featured</Badge>}</Td>
                  <Td>{s.area.name}, {s.city.name}</Td>
                  <Td>{sub ? <>{sub.plan.name} <StatusBadge status={sub.status} /><span className="block text-xs text-slate-500">until {date(sub.currentPeriodEnd)}</span></> : '—'}</Td>
                  <Td><StatusBadge status={s.membershipStatus} /></Td>
                  <Td><StatusBadge status={s.websiteStatus} /></Td>
                  <Td className="text-xs">{s.domains.map((d) => <span key={d.hostname} className="block">{d.hostname} <StatusBadge status={d.verificationStatus} /></span>)}</Td>
                  <Td>{date(s.createdAt)}</Td>
                  <Td><div className="flex gap-1">
                    {!s.isVerified && <Button size="sm" variant="secondary" onClick={() => patch(s.id, { isVerified: true }, 'Marked verified')}>Verify</Button>}
                    <Button size="sm" variant="secondary" onClick={() => patch(s.id, { isFeatured: !s.isFeatured }, s.isFeatured ? 'Unfeatured' : 'Featured')}>{s.isFeatured ? 'Unfeature' : 'Feature'}</Button>
                    {s.membershipStatus === 'ACTIVE'
                      ? <Button size="sm" variant="ghost" onClick={() => { const reason = prompt(`Suspend ${s.name}? Reason:`); if (reason) void patch(s.id, { membershipStatus: 'SUSPENDED', reason }, 'Store suspended'); }}>Suspend</Button>
                      : <Button size="sm" variant="success" onClick={() => patch(s.id, { membershipStatus: 'ACTIVE' }, 'Store reactivated')}>Activate</Button>}
                  </div></Td>
                </tr>
              );
            })}
          </Table>
        ) : <Empty icon="store" title={data ? 'No stores' : 'Loading…'} />}
      </Card>
    </>
  );
}
