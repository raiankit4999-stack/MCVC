'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Leader, TeamMember } from '@/lib/types';
import { Icon } from './icons';
import { Reveal } from './motion';
import { cx } from './ui';

const initials = (name: string) => name.replace(/^(late\s+)?(mr|mrs|ms|dr)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function Avatar({ src, name, className = 'h-14 w-14' }: { src: string | null | undefined; name: string; className?: string }) {
  return src ? (
    <img src={src} alt={name} loading="lazy" className={`${className} shrink-0 rounded-full bg-brand-50 object-cover object-top ring-2 ring-white`} />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-can-red via-can-orange to-can-amber text-sm font-bold text-white ring-2 ring-white`} aria-hidden="true">{initials(name)}</span>
  );
}

/** Large photo cards for the core committee. */
export function CoreCommittee({ team }: { team: TeamMember[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {team.map((t, i) => (
        <Reveal as="li" key={t.name + t.role} delay={(i % 6) * 70} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-card">
          <div className="overflow-hidden">
            {t.photo ? (
              <img src={t.photo} alt={t.name} loading="lazy" className="aspect-[4/5] w-full bg-gradient-to-b from-brand-50 to-white object-cover object-top transition duration-500 group-hover:scale-105" />
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-gradient-to-br from-brand-50 to-orange-100 text-3xl font-bold text-brand-700">{initials(t.name)}</div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold leading-tight text-slate-900">{t.name}</p>
            <p className="mt-0.5 text-xs font-medium text-brand-700">{t.role}</p>
            {t.city && <p className="text-xs text-slate-500">{t.city}</p>}
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

/** Past presidents / advisory committee with years and published contacts. */
export function AdvisoryCommittee({ team }: { team: TeamMember[] }) {
  const past = team.filter((t) => t.years).sort((a, b) => (a.years! < b.years! ? -1 : 1));
  const others = team.filter((t) => !t.years);
  return (
    <>
      {past.length > 0 && (
        <ol className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {past.map((t, i) => (
            <Reveal as="li" key={t.name} delay={i * 80} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <Avatar src={t.photo} name={t.name} className="h-16 w-16" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-can-orange">{t.years}</p>
                <p className="font-semibold leading-tight text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">Past President{t.city ? ` · ${t.city}` : ''}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      )}
      {others.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((t) => (
            <li key={t.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <Avatar src={t.photo} name={t.name} className="h-10 w-10" />
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium text-slate-900">{t.name}</span>
                <span className="block truncate text-xs text-slate-500">{[t.city, t.phone].filter(Boolean).join(' · ')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** City presidents & secretaries with zone tabs and search. */
export function LeadersDirectory({ leaders, zones }: { leaders: Leader[]; zones: string[] }) {
  const [zone, setZone] = useState(zones[0] ?? '');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leaders
      .filter((l) => (term ? `${l.name} ${l.association} ${l.code}`.toLowerCase().includes(term) : l.zone === zone))
      .sort((a, b) => (a.association ?? '').localeCompare(b.association ?? '') || (a.post === 'President' ? -1 : 1));
  }, [leaders, zone, q]);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Zone" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {zones.map((z) => (
            <button key={z} role="tab" aria-selected={!q && zone === z} onClick={() => { setZone(z); setQ(''); }} className={cx('shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition active:scale-95', !q && zone === z ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              {z}
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Search leaders</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or association" className="h-10 w-full rounded-full border-0 pl-9 pr-3 text-base sm:h-9 sm:text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand" />
        </label>
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => (
          <li key={l.post + l.name + l.code} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <Avatar src={l.photo} name={l.name} className="h-12 w-12" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-slate-900">{l.name}</p>
              <p className="text-xs font-medium text-brand-700">City {l.post}{l.code ? ` · ${l.code}` : ''}</p>
              {l.associationSlug ? <Link href={`/associations/${l.associationSlug}`} className="line-clamp-1 text-xs text-slate-500 hover:text-brand">{l.association}</Link> : <p className="line-clamp-1 text-xs text-slate-500">{l.association}</p>}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {l.phone && <a href={`tel:+91${l.phone.replace(/\D/g, '').slice(-10)}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-brand"><Icon name="phone" className="h-3.5 w-3.5" />{l.phone}</a>}
                {l.email && <a href={`mailto:${l.email}`} className="inline-flex min-w-0 items-center gap-1 truncate text-slate-700 hover:text-brand">✉ <span className="truncate">{l.email}</span></a>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!shown.length && <p className="mt-6 text-center text-sm text-slate-500">No leader matches “{q}”.</p>}
    </div>
  );
}
