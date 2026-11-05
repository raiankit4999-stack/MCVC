'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';

interface Member { id: string; name: string; slug: string; isVerified: boolean; websiteStatus: string; area: { name: string } }

export function MemberList({ members }: { members: Member[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => (q ? members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())) : members), [q, members]);
  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search members</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${members.length} members`} className="h-9 w-full rounded-lg border-0 pl-9 pr-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand" />
        </label>
        <span className="shrink-0 text-xs text-slate-500">{shown.length} shown</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => (
          <li key={m.id}>
            <Link href={`/stores/${m.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-brand-100 hover:bg-brand-50">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-xs font-bold text-stone-600">{m.name.replace(/^(m\/s\.?\s*|shree\s+|shri\s+)/i, '').slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{m.name}</span><span className="block truncate text-xs text-slate-500">{m.area.name}</span></span>
              {m.websiteStatus === 'PUBLISHED' && <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Website</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
