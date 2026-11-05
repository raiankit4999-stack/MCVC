import Link from 'next/link';
import { BrandBadges, BrandLegend, BRAND_STATUS } from '@/components/brand-badges';
import { Icon } from '@/components/icons';
import { Reveal } from '@/components/motion';
import { storeUrl } from '@/components/store-card';
import { cx } from '@/components/ui';
import { api } from '@/lib/server-api';
import type { BrandStatus, City, Network, StoreCard } from '@/lib/types';
import { CentreTable } from './table';

export const metadata = { title: 'Service centres' };
export const dynamic = 'force-dynamic';

type SP = { view?: string; brand?: string; status?: BrandStatus; city?: string };

export default async function ServiceCentres({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const view = sp.view === 'brands' ? 'brands' : 'members';
  const qs = new URLSearchParams(Object.entries({ brand: sp.brand, status: sp.status, city: sp.city }).filter(([, v]) => v) as [string, string][]);
  const [data, cities, network] = await Promise.all([
    api<{ items: StoreCard[]; brands: { brand: string; stores: number }[] }>(`/service-centres?${qs}`, { revalidate: 0 }),
    api<City[]>('/cities'),
    api<Network>('/community/network'),
  ]);
  const link = (patch: Partial<SP>) => {
    const n = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/service-centres?${n}`;
  };
  const chip = (active: boolean) => cx('shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition active:scale-95', active ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');

  return (
    <>
      <section className="hero-bg px-4 pb-10 pt-12 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Service centres</h1>
          <p className="mt-2 max-w-2xl text-stone-300">Find a CAN member store that services your brand — and see at a glance whether it is brand authorised, third-party authorised or an independent (unauthorised) repairer.</p>
          <nav className="mt-6 inline-flex rounded-2xl bg-white/10 p-1 ring-1 ring-white/15" aria-label="Service centre lists">
            <Link href="/service-centres" className={cx('rounded-xl px-4 py-2 text-sm font-semibold transition', view === 'members' ? 'bg-white text-ink' : 'text-white/80 hover:text-white')}>CAN member stores</Link>
            <Link href="/service-centres?view=brands" className={cx('rounded-xl px-4 py-2 text-sm font-semibold transition', view === 'brands' ? 'bg-white text-ink' : 'text-white/80 hover:text-white')}>Brand-run centres</Link>
          </nav>
        </div>
      </section>

      {view === 'brands' ? (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="mb-6 max-w-3xl text-sm text-slate-600">Service centres run by brands and their national service partners, as listed by FITAG.</p>
          <CentreTable rows={network.serviceCentres} />
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
          <BrandLegend />

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                <Link href={link({ brand: undefined })} className={chip(!sp.brand)}>All brands</Link>
                {data.brands.map((b) => <Link key={b.brand} href={link({ brand: b.brand })} className={chip(sp.brand === b.brand)}>{b.brand} <span className="opacity-60">{b.stores}</span></Link>)}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Badge</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={link({ status: undefined })} className={chip(!sp.status)}>Any</Link>
                  {(Object.keys(BRAND_STATUS) as BrandStatus[]).map((k) => <Link key={k} href={link({ status: k })} className={chip(sp.status === k)}>{BRAND_STATUS[k].short}</Link>)}
                </div>
              </div>
              <form action="/service-centres" className="ml-auto flex items-end gap-2">
                {sp.brand && <input type="hidden" name="brand" value={sp.brand} />}
                {sp.status && <input type="hidden" name="status" value={sp.status} />}
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">City
                  <select name="city" defaultValue={sp.city ?? ''} className="mt-2 block h-10 rounded-lg border-0 pr-8 text-base font-normal normal-case tracking-normal text-slate-800 ring-1 ring-slate-200 sm:text-sm">
                    <option value="">All cities</option>
                    {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
                <button className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white active:scale-[.97]">Apply</button>
              </form>
            </div>
          </div>

          <p className="text-sm text-slate-500">{data.items.length} {data.items.length === 1 ? 'store' : 'stores'}{sp.brand ? ` servicing ${sp.brand}` : ''}{sp.status ? ` · ${BRAND_STATUS[sp.status].label}` : ''}</p>

          {data.items.length ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((s, i) => {
                const own = sp.brand ? s.brandServices.filter((b) => b.brand === sp.brand) : [];
                const rest = sp.brand ? s.brandServices.filter((b) => b.brand !== sp.brand) : s.brandServices;
                return (
                  <Reveal as="li" key={s.id} delay={(i % 3) * 70} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-start gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: s.primaryColor }}>{s.name[0]}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/stores/${s.slug}`} className="flex items-center gap-1.5 font-semibold text-slate-900 hover:text-brand">{s.name}{s.isVerified && <Icon name="shield" className="h-4 w-4 shrink-0 text-brand" />}</Link>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Icon name="pin" className="h-3.5 w-3.5" />{s.area.name}, {s.city.name}</p>
                        {s.association && <p className="mt-0.5 truncate text-xs text-brand-700">Member · {s.association.code ?? s.association.name}</p>}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Brands serviced</p>
                      {own.length > 0 && <BrandBadges items={own} size="md" className="mb-2" />}
                      <BrandBadges items={rest} />
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                      {s.phone ? <a href={`tel:${s.phone}`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-800 ring-1 ring-slate-200 active:bg-slate-50"><Icon name="phone" className="h-4 w-4" />Call</a> : <span />}
                      {s.websitePublished ? (
                        <a href={`${storeUrl(s)}/book`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand text-sm font-semibold text-white active:scale-[.98]"><Icon name="calendar" className="h-4 w-4" />Book repair</a>
                      ) : (
                        <Link href={`/stores/${s.slug}`} className="flex h-10 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white active:scale-[.98]">View store</Link>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-medium text-slate-900">No member store matches these filters yet</p>
              <p className="mt-1 text-sm text-slate-500">Try another brand, or see the <Link href="/service-centres?view=brands" className="font-semibold text-brand">brand-run centres</Link>.</p>
            </div>
          )}

          <div className="rounded-2xl bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Do you service a brand?</p>
              <p className="mt-1 text-sm text-stone-300">CAN members add their brands and authorisation in <b>Website &amp; branding → Brands we service</b>.</p>
            </div>
            <Link href="/join" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold sm:mt-0">Join CAN</Link>
          </div>
        </div>
      )}
    </>
  );
}
