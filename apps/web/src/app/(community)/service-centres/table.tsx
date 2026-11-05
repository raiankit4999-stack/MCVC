'use client';

import { useMemo, useState } from 'react';
import type { Network } from '@/lib/types';

export function CentreTable({ rows }: { rows: Network['serviceCentres'] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => rows.filter((r) => !q || `${r.brand} ${r.address}`.toLowerCase().includes(q.toLowerCase())), [q, rows]);
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or city (e.g. Asus, Rajkot)" aria-label="Search service centres" className="h-11 w-full max-w-md rounded-xl border-0 px-4 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((r, i) => (
          <article key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="font-semibold text-slate-900">{r.brand}</h2>
            <p className="mt-2 text-sm text-slate-600">{r.address}</p>
            <dl className="mt-3 space-y-1 text-sm">
              {r.phone && <div className="flex gap-2"><dt className="w-20 text-slate-500">Phone</dt><dd><a className="text-brand" href={`tel:${r.phone.split(/[,/]/)[0].replace(/\s/g, '')}`}>{r.phone}</a></dd></div>}
              {r.tollFree && <div className="flex gap-2"><dt className="w-20 text-slate-500">Toll free</dt><dd>{r.tollFree}</dd></div>}
              {r.email && <div className="flex gap-2"><dt className="w-20 text-slate-500">Email</dt><dd className="truncate"><a className="text-brand" href={`mailto:${r.email}`}>{r.email}</a></dd></div>}
              {r.hours && <div className="flex gap-2"><dt className="w-20 text-slate-500">Hours</dt><dd>{r.hours}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
      {!shown.length && <p className="mt-8 text-center text-sm text-slate-500">No service centre matches “{q}”.</p>}
    </>
  );
}
