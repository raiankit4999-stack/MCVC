'use client';

import { useState } from 'react';
import { apiFetch, errorText } from '@/lib/client-api';
import { dateTime, label, money } from '@/lib/format';

export interface TrackView {
  jobNumber: string; status: string; statusLabel: string; reportedProblem: string; diagnosis: string | null; estimateAmount: string | null; approval: string; estimatedDelivery: string | null;
  device: { category: string; brand: string; model: string }; technician: { name: string } | null;
  updates: { status: string; note: string | null; createdAt: string }[];
  invoice: { invoiceNumber: string; grandTotal: string; amountPaid: string; paymentStatus: string } | null;
}
const FLOW = ['RECEIVED', 'DIAGNOSING', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED'];

export function Tracker({ host, token, initial }: { host: string; token: string; initial: TrackView }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState('');
  const idx = Math.max(0, FLOW.indexOf(v.status === 'WAITING_FOR_APPROVAL' || v.status === 'WAITING_FOR_PARTS' ? 'DIAGNOSING' : v.status));
  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    try { setV(await apiFetch<TrackView>(`/public/store/repair-tracking/${token}/approval`, { method: 'POST', host, store: false, body: { decision } })); } catch (e) { setError(errorText(e)); }
  };
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm text-slate-500">Job card {v.jobNumber}</p>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{v.statusLabel}</h1>
      <p className="mt-1 text-slate-600">{v.device.category} · {v.device.brand} {v.device.model}{v.technician && ` · Technician: ${v.technician.name}`}</p>

      {v.status !== 'CANCELLED' && (
        <ol className="mt-8 grid grid-cols-6 gap-1" aria-label="Repair progress">
          {FLOW.map((s, i) => <li key={s} className="text-center"><span className="block h-2 rounded-full" style={{ background: i <= idx ? 'var(--brand)' : '#e2e8f0' }} /><span className="mt-1 hidden text-[11px] text-slate-500 sm:block">{label(s)}</span></li>)}
        </ol>
      )}

      {v.status === 'WAITING_FOR_APPROVAL' && v.approval === 'PENDING' && (
        <div className="mt-8 rounded-2xl border-2 p-6" style={{ borderColor: 'var(--brand)' }}>
          <p className="font-semibold">Quotation awaiting your approval</p>
          {v.diagnosis && <p className="mt-2 text-slate-700">{v.diagnosis}</p>}
          <p className="mt-3 text-2xl font-bold">{money(v.estimateAmount)}</p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={() => decide('APPROVED')} className="h-11 flex-1 rounded-lg font-semibold text-white" style={{ background: 'var(--brand)' }}>Approve repair</button>
            <button onClick={() => decide('REJECTED')} className="h-11 flex-1 rounded-lg font-semibold ring-1 ring-slate-300">Decline</button>
          </div>
        </div>
      )}

      <dl className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-6 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Reported problem</dt><dd className="font-medium">{v.reportedProblem}</dd></div>
        {v.estimatedDelivery && <div><dt className="text-slate-500">Estimated completion</dt><dd className="font-medium">{new Date(v.estimatedDelivery).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</dd></div>}
        {v.estimateAmount && <div><dt className="text-slate-500">Approved quotation</dt><dd className="font-medium">{money(v.estimateAmount)} · {label(v.approval)}</dd></div>}
        {v.invoice && <div><dt className="text-slate-500">Invoice {v.invoice.invoiceNumber}</dt><dd className="font-medium">{money(v.invoice.grandTotal)} · {label(v.invoice.paymentStatus)}</dd></div>}
        {v.status === 'READY' && <div className="sm:col-span-2"><dt className="text-slate-500">Collection</dt><dd className="font-medium">Your device is ready. Please bring your job card number when collecting.</dd></div>}
      </dl>

      <h2 className="mt-10 font-semibold">Updates</h2>
      <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-6">
        {[...v.updates].reverse().map((u, i) => (
          <li key={i} className="relative"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full" style={{ background: i === 0 ? 'var(--brand)' : '#cbd5e1' }} />
            <p className="font-medium">{label(u.status)}</p>{u.note && <p className="text-sm text-slate-600">{u.note}</p>}<p className="text-xs text-slate-400">{dateTime(u.createdAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
