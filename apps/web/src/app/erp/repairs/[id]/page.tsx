'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, ButtonLink, Card, Field, Input, PageHeader, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { date, dateTime, label, money } from '@/lib/format';
import { useStore } from '../../context';

interface Job {
  id: string; jobNumber: string; status: string; approval: string; reportedProblem: string; physicalCondition: string | null; accessories: string[]; diagnosis: string | null; estimateAmount: string | null; estimatedDelivery: string | null; createdAt: string;
  customer: { id: string; name: string; phone: string }; device: { category: string; brand: string; model: string; serialNumber: string | null }; technician: { name: string } | null;
  updates: { id: string; status: string; note: string | null; isPublic: boolean; createdAt: string }[];
  parts: { id: string; productId: string; quantity: number; unitPrice: string }[];
  invoices: { id: string; invoiceNumber: string; grandTotal: string; paymentStatus: string; status: string }[];
}
const NEXT: Record<string, string[]> = {
  RECEIVED: ['DIAGNOSING', 'CANCELLED'], DIAGNOSING: ['WAITING_FOR_PARTS', 'IN_PROGRESS', 'CANCELLED'], WAITING_FOR_APPROVAL: ['CANCELLED', 'READY'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['QUALITY_CHECK', 'WAITING_FOR_PARTS'], QUALITY_CHECK: ['READY', 'IN_PROGRESS'], READY: ['DELIVERED'], DELIVERED: [], CANCELLED: [],
};

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { store } = useStore();
  const toast = useToast();
  const { data: job, reload } = useApi<Job>(`/repair-jobs/${id}`);
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState({ diagnosis: '', estimateAmount: '' });
  const [part, setPart] = useState({ q: '', productId: '', quantity: 1 });
  const [parts, setParts] = useState<{ id: string; name: string; stockOnHand: number }[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { try { setToken(sessionStorage.getItem(`track:${id}`)); } catch { /* ignore */ } }, [id]);
  useEffect(() => {
    if (part.q.length < 2) return;
    const t = setTimeout(() => void apiFetch<{ items: { id: string; name: string; stockOnHand: number; isSerialized: boolean }[] }>(`/products?q=${encodeURIComponent(part.q)}&pageSize=6`).then((r) => setParts(r.items.filter((p) => !p.isSerialized))), 150);
    return () => clearTimeout(t);
  }, [part.q]);
  if (!job) return <Skeleton className="h-96" />;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    try { await fn(); toast(ok); void reload(); } catch (e) { setError(errorText(e)); }
  };
  const move = (status: string, extra: Record<string, unknown> = {}) => act(() => apiFetch(`/repair-jobs/${id}/status`, { method: 'PATCH', body: { status, note: note || undefined, ...extra } }).then(() => setNote('')), `Moved to ${label(status)}`);
  const trackingUrl = token ? `http://${store.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'mcvc.localhost'}:3000/track/${token}` : null;
  const paid = job.invoices.some((i) => i.status === 'ISSUED' && i.paymentStatus === 'PAID');

  return (
    <>
      <PageHeader title={`Job card ${job.jobNumber}`} subtitle={<>Received {dateTime(job.createdAt)} · <StatusBadge status={job.status} /></>} actions={
        <>
          <Button variant="secondary" onClick={() => window.print()}>Print job card</Button>
          {!['DELIVERED', 'CANCELLED'].includes(job.status) && <ButtonLink href={`/erp/pos?repairJobId=${job.id}`}>Create invoice</ButtonLink>}
        </>
      } />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Device & problem"><dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Customer</dt><dd className="font-medium"><Link className="text-brand" href={`/erp/customers/${job.customer.id}`}>{job.customer.name}</Link> · {job.customer.phone}</dd></div>
            <div><dt className="text-xs text-slate-500">Device</dt><dd className="font-medium">{job.device.category} — {job.device.brand} {job.device.model}</dd>{job.device.serialNumber && <dd className="text-xs text-slate-500">S/N {job.device.serialNumber}</dd>}</div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Reported problem</dt><dd>{job.reportedProblem}</dd></div>
            {job.physicalCondition && <div><dt className="text-xs text-slate-500">Condition at intake</dt><dd>{job.physicalCondition}</dd></div>}
            <div><dt className="text-xs text-slate-500">Accessories</dt><dd className="flex flex-wrap gap-1">{job.accessories.length ? job.accessories.map((a) => <Badge key={a}>{a}</Badge>) : 'None'}</dd></div>
            {job.diagnosis && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Diagnosis</dt><dd>{job.diagnosis}</dd></div>}
            <div><dt className="text-xs text-slate-500">Estimate</dt><dd className="font-medium">{job.estimateAmount ? money(job.estimateAmount) : '—'} {job.approval !== 'NOT_REQUESTED' && <StatusBadge status={job.approval} />}</dd></div>
            <div><dt className="text-xs text-slate-500">Estimated delivery</dt><dd>{job.estimatedDelivery ? date(job.estimatedDelivery) : '—'}</dd></div>
          </dl></Card>

          <Card title="Timeline">
            <ol className="relative space-y-5 p-5">
              {job.updates.map((u, i) => (
                <li key={u.id} className="relative flex gap-4">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${i === job.updates.length - 1 ? 'bg-brand ring-brand-100' : 'bg-slate-300 ring-slate-100'}`} />
                  <div className="text-sm">
                    <p className="font-medium">{label(u.status)} {!u.isPublic && <Badge>Internal</Badge>}</p>
                    {u.note && <p className="text-slate-600">{u.note}</p>}
                    <p className="text-xs text-slate-400">{dateTime(u.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="no-print space-y-4">
          {NEXT[job.status].length > 0 && (
            <Card title="Update status"><div className="space-y-3 p-4">
              <Field label="Note for customer (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="flex flex-wrap gap-2">
                {NEXT[job.status].map((s) => (
                  <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'ghost' : s === 'DELIVERED' ? 'success' : 'secondary'} disabled={s === 'DELIVERED' && !paid} onClick={() => move(s)}>{label(s)}</Button>
                ))}
              </div>
              {job.status === 'READY' && !paid && <p className="text-xs text-slate-500">Collect payment on an invoice before delivery, or <button className="font-semibold text-brand" onClick={() => move('DELIVERED', { noCharge: true })}>deliver at no charge</button>.</p>}
            </div></Card>
          )}
          {['DIAGNOSING', 'WAITING_FOR_APPROVAL'].includes(job.status) && (
            <Card title="Share quotation"><div className="space-y-3 p-4">
              <Field label="Diagnosis"><Textarea value={quote.diagnosis} onChange={(e) => setQuote({ ...quote, diagnosis: e.target.value })} /></Field>
              <Field label="Estimate ₹"><Input type="number" min={0} value={quote.estimateAmount} onChange={(e) => setQuote({ ...quote, estimateAmount: e.target.value })} /></Field>
              <Button className="w-full" disabled={!quote.diagnosis || !quote.estimateAmount} onClick={() => act(() => apiFetch(`/repair-jobs/${id}/quote`, { method: 'POST', body: { diagnosis: quote.diagnosis, estimateAmount: Number(quote.estimateAmount) } }), 'Quotation sent to customer')}>Send for approval</Button>
              {job.approval === 'PENDING' && (
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="success" onClick={() => act(() => apiFetch(`/repair-jobs/${id}/approval`, { method: 'POST', body: { decision: 'APPROVED' } }), 'Approval recorded')}>Customer approved</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(() => apiFetch(`/repair-jobs/${id}/approval`, { method: 'POST', body: { decision: 'REJECTED' } }), 'Rejection recorded')}>Declined</Button>
                </div>
              )}
            </div></Card>
          )}
          {['DIAGNOSING', 'WAITING_FOR_PARTS', 'IN_PROGRESS'].includes(job.status) && (
            <Card title="Parts used"><div className="space-y-3 p-4">
              <Input placeholder="Search spare part" value={part.q} onChange={(e) => setPart({ ...part, q: e.target.value, productId: '' })} />
              {parts.length > 0 && !part.productId && <ul className="rounded-lg border border-slate-200 text-sm">{parts.map((p) => <li key={p.id}><button className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => setPart({ ...part, productId: p.id, q: p.name })}>{p.name} <span className="text-xs text-slate-500">({p.stockOnHand})</span></button></li>)}</ul>}
              <div className="flex gap-2"><Input type="number" min={1} value={part.quantity} onChange={(e) => setPart({ ...part, quantity: Number(e.target.value) })} className="w-20" /><Button variant="secondary" disabled={!part.productId} onClick={() => act(() => apiFetch(`/repair-jobs/${id}/parts`, { method: 'POST', body: { productId: part.productId, quantity: part.quantity } }).then(() => setPart({ q: '', productId: '', quantity: 1 })), 'Part issued from stock')}>Issue part</Button></div>
              {job.parts.length > 0 && <p className="text-xs text-slate-500">{job.parts.length} part line(s) issued</p>}
            </div></Card>
          )}
          <Card title="Customer tracking"><div className="space-y-2 p-4 text-sm">
            {trackingUrl ? (
              <><p className="break-all rounded-lg bg-slate-50 p-2 font-mono text-xs">{trackingUrl}</p><Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(trackingUrl); toast('Link copied'); }}>Copy link</Button></>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => act(async () => { const r = await apiFetch<{ trackingToken: string }>(`/repair-jobs/${id}/tracking-link`, { method: 'POST' }); sessionStorage.setItem(`track:${id}`, r.trackingToken); setToken(r.trackingToken); }, 'New tracking link generated')}>Generate tracking link</Button>
            )}
            <p className="text-xs text-slate-500">Tracking links are shown once and stored hashed. Generating a new link invalidates the old one.</p>
          </div></Card>
          {job.invoices.length > 0 && (
            <Card title="Invoices"><ul className="divide-y divide-slate-100 text-sm">{job.invoices.map((i) => <li key={i.id} className="flex items-center justify-between px-4 py-2"><Link className="text-brand" href={`/erp/invoices/${i.id}`}>{i.invoiceNumber}</Link><span>{money(i.grandTotal)} <StatusBadge status={i.paymentStatus} /></span></li>)}</ul></Card>
          )}
        </aside>
      </div>
    </>
  );
}
