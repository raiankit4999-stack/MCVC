'use client';

import Link from 'next/link';
import { HBars } from '@/components/charts';
import { Icon, IconName } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button, Card, Empty, PageHeader, Skeleton, Stat, StatusBadge, Table, Td } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { compactInr, date } from '@/lib/format';

interface Dash {
  stores: { total: number; active: number; suspended: number; websitesPublished: number };
  pendingApprovals: number; activeMemberships: number; renewalsDueIn14Days: number; monthlyRecurringRevenue: number;
  activity: { bookings: number; inquiries: number; repairJobs: number };
  byCity: { name: string; count: number }[];
}
interface App { id: string; businessName: string; cityName: string; areaName: string; createdAt: string; status: string; plan: { name: string } }

export default function AdminHome() {
  const toast = useToast();
  const d = useApi<Dash>('/master/dashboard');
  const apps = useApi<{ items: App[] }>('/master/applications?status=PENDING&pageSize=6');
  const decide = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await apiFetch(`/master/applications/${id}/decision`, { method: 'PATCH', body: { decision } });
      toast(decision === 'APPROVE' ? 'Approved — store workspace provisioned' : 'Application rejected');
      void apps.reload(); void d.reload();
    } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <>
      <PageHeader title="Community master dashboard" subtitle="Network-wide overview. Store-level customer and financial records are not shown here." />
      {!d.data ? <Skeleton className="h-24" /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon="store" label={`Total stores · ${d.data.stores.suspended} suspended`} value={d.data.stores.total} />
          <Stat icon="check" label="Active memberships" value={d.data.activeMemberships} tone="green" />
          <Stat icon="clock" label="Pending approval" value={d.data.pendingApprovals} tone="amber" />
          <Stat icon="tag" label="Subscription MRR" value={compactInr(d.data.monthlyRecurringRevenue)} tone="violet" />
        </div>
      )}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_320px]">
        <Card title="Stores by city"><div className="p-5">{d.data && <HBars rows={d.data.byCity.map((c) => ({ label: c.name ?? '—', value: c.count }))} />}</div></Card>
        <Card title="Network activity (all time)">
          {d.data && (
            <ul className="divide-y divide-slate-100 text-sm">
              {([['calendar', 'Bookings', d.data.activity.bookings], ['bell', 'Website inquiries', d.data.activity.inquiries], ['wrench', 'Repair jobs', d.data.activity.repairJobs], ['globe', 'Websites published', d.data.stores.websitesPublished], ['clock', 'Renewals due in 14 days', d.data.renewalsDueIn14Days]] as [IconName, string, number][]).map(([i, l, v]) => (
                <li key={l} className="flex items-center gap-3 px-5 py-3"><Icon name={i} className="h-4 w-4 text-slate-400" /><span className="flex-1">{l}</span><span className="font-semibold">{v}</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Quick actions">
          <div className="grid gap-2 p-4">
            {([['/admin/cities', 'map', 'Add city / area'], ['/admin/plans', 'tag', 'Manage plans'], ['/admin/stores', 'store', 'Manage stores'], ['/admin/audit', 'shield', 'View audit log']] as [string, IconName, string][]).map(([h, i, l]) => (
              <Link key={h} href={h} className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100"><Icon name={i} className="h-4 w-4" />{l}</Link>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Recent store applications" className="mt-6" action={<Link href="/admin/applications" className="text-xs font-semibold text-brand">All applications</Link>}>
        {apps.data?.items.length ? (
          <Table head={['Store', 'City', 'Plan', 'Applied', 'Status', '']}>
            {apps.data.items.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.businessName}</Td><Td>{a.areaName}, {a.cityName}</Td><Td>{a.plan.name}</Td><Td>{date(a.createdAt)}</Td><Td><StatusBadge status={a.status} /></Td>
                <Td><div className="flex gap-2"><Button size="sm" variant="success" onClick={() => decide(a.id, 'APPROVE')}>Approve</Button><Button size="sm" variant="ghost" onClick={() => decide(a.id, 'REJECT')}>Reject</Button></div></Td>
              </tr>
            ))}
          </Table>
        ) : <Empty icon="file" title="No applications waiting" />}
      </Card>
    </>
  );
}
