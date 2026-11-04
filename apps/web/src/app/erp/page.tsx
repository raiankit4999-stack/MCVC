'use client';

import Link from 'next/link';
import { Donut, SalesArea, SERIES } from '@/components/charts';
import { Icon } from '@/components/icons';
import { ButtonLink, Card, Empty, Skeleton, Stat, StatusBadge, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { compactInr, money, time, todayIst } from '@/lib/format';
import { useStore } from './context';

interface Dashboard {
  todaySales: { amount: number; count: number };
  monthlyRevenue: number;
  grossProfit: number;
  receivables: number;
  totalPurchases: number;
  customers: number;
  newLeads: number;
  activeRepairJobs: number;
  pendingBookings: number;
  warrantyExpiringIn30Days: number;
  lowStock: { count: number; items: { id: string; name: string; stockOnHand: number; reorderLevel: number }[] };
  recentTransactions: { id: string; invoiceNumber: string; docType: string; issuedAt: string; grandTotal: string; paymentStatus: string; customerSnapshot: { name?: string } }[];
  chart: { day: string; sales: number; profit: number }[];
}
interface Inventory { totals: { products: number; units: number; lowStock: number }; items: { stockOnHand: number; reorderLevel: number }[] }
interface Job { id: string; jobNumber: string; status: string; reportedProblem: string; customer: { name: string }; device: { brand: string; model: string } }
interface Booking { id: string; slotStart: string; status: string; customer: { name: string }; service: { name: string } | null; deviceModel: string | null }

export default function ErpDashboard() {
  const { store } = useStore();
  const d = useApi<Dashboard>('/dashboard');
  const inv = useApi<Inventory>('/inventory');
  const jobs = useApi<{ items: Job[] }>('/repair-jobs?active=true&pageSize=6');
  const today = todayIst();
  const bookings = useApi<Booking[]>(`/bookings?from=${today}T00:00:00%2B05:30&to=${today}T23:59:59%2B05:30`);

  const stock = inv.data?.items ?? [];
  const parts = [
    { label: 'In stock', value: stock.filter((p) => p.stockOnHand > p.reorderLevel).length, color: SERIES.blue },
    { label: 'Low stock', value: stock.filter((p) => p.stockOnHand > 0 && p.stockOnHand <= p.reorderLevel).length, color: SERIES.aqua },
    { label: 'Out of stock', value: stock.filter((p) => p.stockOnHand === 0).length, color: SERIES.orange },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Here&apos;s what&apos;s happening at {store.name} today</h1>
          {store.websiteStatus !== 'PUBLISHED' && (
            <p className="mt-1 text-sm text-amber-700">Your website is not published yet. <Link href="/erp/settings" className="font-semibold underline">Finish setup</Link></p>
          )}
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/erp/repairs/new" variant="secondary"><Icon name="wrench" className="h-4 w-4" /> New job card</ButtonLink>
          <ButtonLink href="/erp/pos"><Icon name="plus" className="h-4 w-4" /> New sale</ButtonLink>
        </div>
      </div>

      {!d.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat icon="chart" label="Revenue this month" value={compactInr(d.data.monthlyRevenue)} tone="blue" />
          <Stat icon="receipt" label={`Today's sales · ${d.data.todaySales.count} invoices`} value={compactInr(d.data.todaySales.amount)} tone="violet" />
          <Stat icon="wrench" label="Active repair jobs" value={d.data.activeRepairJobs} tone="amber" />
          <Stat icon="calendar" label="Pending bookings" value={d.data.pendingBookings} tone="rose" />
          <Stat icon="tag" label="Gross profit (30 days)" value={compactInr(d.data.grossProfit)} tone="green" />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Sales — last 30 days">
          <div className="p-4">{d.data ? <SalesArea data={d.data.chart} /> : <Skeleton className="h-64" />}</div>
        </Card>
        <Card title="Inventory status" action={<Link href="/erp/inventory" className="text-xs font-semibold text-brand">View</Link>}>
          <div className="p-5">{inv.data ? <Donut parts={parts} centerLabel="Products" /> : <Skeleton className="h-40" />}</div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="Recent repair jobs" action={<Link href="/erp/repairs" className="text-xs font-semibold text-brand">All jobs</Link>}>
          {jobs.data?.items.length ? (
            <Table head={['Job', 'Customer', 'Device', 'Issue', 'Status']}>
              {jobs.data.items.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <Td><Link href={`/erp/repairs/${j.id}`} className="font-medium text-brand">{j.jobNumber.split('/').pop()}</Link></Td>
                  <Td>{j.customer.name}</Td>
                  <Td>{j.device.brand} {j.device.model}</Td>
                  <Td className="max-w-[180px] truncate">{j.reportedProblem}</Td>
                  <Td><StatusBadge status={j.status} /></Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty icon="wrench" title="No active repair jobs">Create a job card when a device comes in.</Empty>
          )}
        </Card>
        <Card title="Today's bookings" action={<Link href="/erp/bookings" className="text-xs font-semibold text-brand">Calendar</Link>}>
          {bookings.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {bookings.data.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span className="w-16 font-semibold text-slate-900">{time(b.slotStart)}</span>
                  <span className="min-w-0 flex-1 truncate">{b.service?.name ?? 'Consultation'} <span className="text-slate-500">· {b.customer.name}</span></span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="calendar" title="No bookings today" />
          )}
        </Card>
      </div>

      {d.data && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title="Recent transactions" action={<Link href="/erp/invoices" className="text-xs font-semibold text-brand">Invoices</Link>}>
            {d.data.recentTransactions.length ? (
              <Table head={['Number', 'Customer', 'Total', 'Payment']}>
                {d.data.recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <Td><Link className="font-medium text-brand" href={`/erp/invoices/${t.id}`}>{t.invoiceNumber}</Link></Td>
                    <Td>{t.customerSnapshot?.name ?? 'Walk-in'}</Td>
                    <Td>{money(t.grandTotal)}</Td>
                    <Td><StatusBadge status={t.paymentStatus} /></Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <Empty icon="receipt" title="No invoices yet" />
            )}
          </Card>
          <Card title="Attention">
            <ul className="divide-y divide-slate-100 text-sm">
              <li className="flex justify-between px-5 py-3"><span>Outstanding receivables</span><span className="font-semibold">{money(d.data.receivables)}</span></li>
              <li className="flex justify-between px-5 py-3"><span>New leads</span><span className="font-semibold">{d.data.newLeads}</span></li>
              <li className="flex justify-between px-5 py-3"><span>Warranties expiring in 30 days</span><span className="font-semibold">{d.data.warrantyExpiringIn30Days}</span></li>
              <li className="flex justify-between px-5 py-3"><span>Customers</span><span className="font-semibold">{d.data.customers}</span></li>
              {d.data.lowStock.items.slice(0, 4).map((p) => (
                <li key={p.id} className="flex justify-between px-5 py-3"><span className="truncate text-amber-800">Low stock: {p.name}</span><span className="font-semibold">{p.stockOnHand} left</span></li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
