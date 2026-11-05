import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssociationBadge } from '@/components/association-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui';
import { apiOrNull } from '@/lib/server-api';
import type { AssociationDetail } from '@/lib/types';
import { MemberList } from './member-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await apiOrNull<AssociationDetail>(`/associations/${(await params).slug}`);
  return { title: a ? `${a.name}${a.code ? ` (${a.code})` : ''}` : 'Association' };
}

export default async function AssociationPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await apiOrNull<AssociationDetail>(`/associations/${(await params).slug}`);
  if (!a) notFound();
  return (
    <>
      <section className="hero-bg px-4 pb-10 pt-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <nav className="text-xs text-stone-400"><Link href="/associations" className="hover:text-white">Associations</Link> / {a.zone}</nav>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <AssociationBadge code={a.code} slug={a.slug} size="lg" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{a.name}{a.code && <span className="text-stone-400"> ({a.code})</span>}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-300">
                <span className="flex items-center gap-1"><Icon name="pin" className="h-4 w-4" />{a.city.name}</span>
                <span>{a.zone}</span>
                <span className="font-semibold text-white">{a.memberCount} member businesses</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-lg font-bold text-ink">Member businesses</h2>
          {a.members.length ? <MemberList members={a.members} /> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">The member list for this association will be published soon.</p>}
        </section>
        <aside className="space-y-4">
          {a.officeBearers.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Office bearers</h2>
              <ul className="mt-3 space-y-3">
                {a.officeBearers.map((b) => (
                  <li key={b.post + b.name} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{b.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 text-sm"><span className="block font-medium text-slate-900">{b.name}</span><span className="text-slate-500">{b.post}{b.firm ? ` · ${b.firm}` : ''}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl bg-ink p-5 text-white">
            <p className="font-semibold">Member of {a.code ?? 'this association'}?</p>
            <p className="mt-1 text-sm text-stone-300">Claim your business on CAN to get your own website, GST billing, inventory and repair management.</p>
            <Link href={`/join?association=${a.slug}`} className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold">Join CAN</Link>
          </div>
          <Link href={`/stores?association=${a.slug}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-brand shadow-card">Browse in store directory <Icon name="arrowRight" className="h-4 w-4" /></Link>
          {a.sourceUrl && <p className="px-1 text-xs text-slate-500">Member list as published by FITAG. <a href={a.sourceUrl} className="text-brand" target="_blank" rel="noreferrer">Source</a> · <Badge>{a.city.name}</Badge></p>}
        </aside>
      </div>
    </>
  );
}
