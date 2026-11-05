import Link from 'next/link';
import { Icon } from '@/components/icons';
import { StoreCard } from '@/components/store-card';
import { api } from '@/lib/server-api';
import type { Area, Association, Category, City, StoreCard as S } from '@/lib/types';
import { SearchBar } from '../search-bar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find stores' };

type SP = Record<string, string | undefined>;

export default async function Stores({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const [cities, categories, areas, result] = await Promise.all([
    api<City[]>('/cities'),
    api<Category[]>('/categories'),
    sp.city ? api<Area[]>(`/areas?city=${encodeURIComponent(sp.city)}`) : Promise.resolve([] as Area[]),
    api<{ total: number; page: number; pageSize: number; items: S[] }>(`/stores?${qs}`, { revalidate: 0 }),
  ]);
  const association = sp.association ? (await api<Association[]>('/associations')).find((a) => a.slug === sp.association) : undefined;
  const toggle = (k: string, v: string) => {
    const n = new URLSearchParams(qs);
    if (n.get(k) === v) n.delete(k);
    else n.set(k, v);
    n.delete('page');
    return `/stores?${n}`;
  };
  const city = cities.find((c) => c.slug === sp.city);
  const filters = (
    <>
          {areas.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold text-slate-900">Area</h2>
              <ul className="space-y-1">
                {areas.map((a) => (
                  <li key={a.slug}><Link className={`block rounded-lg px-2 py-1 ${sp.area === a.slug ? 'bg-brand-50 font-medium text-brand' : 'text-slate-600 hover:bg-slate-100'}`} href={toggle('area', a.slug)}>{a.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">Filters</h2>
            <ul className="space-y-1">
              {[['verified', 'true', 'Verified members'], ['openNow', 'true', 'Open now'], ['minRating', '4', 'Rated 4+']].map(([k, v, l]) => (
                <li key={k}><Link className={`flex items-center gap-2 rounded-lg px-2 py-1 ${sp[k] === v ? 'bg-brand-50 font-medium text-brand' : 'text-slate-600 hover:bg-slate-100'}`} href={toggle(k, v)}>
                  <span className={`grid h-4 w-4 place-items-center rounded border ${sp[k] === v ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}>{sp[k] === v && <Icon name="check" className="h-3 w-3" />}</span>{l}
                </Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">Category</h2>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.slug}><Link className={`block rounded-lg px-2 py-1 ${sp.category === c.slug ? 'bg-brand-50 font-medium text-brand' : 'text-slate-600 hover:bg-slate-100'}`} href={toggle('category', c.slug)}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <form action="/stores" className="space-y-2">
            {Object.entries(sp).filter(([k, v]) => v && k !== 'product').map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <h2 className="font-semibold text-slate-900">Product availability</h2>
            <input name="product" defaultValue={sp.product} placeholder="e.g. RTX 4060" className="h-9 w-full rounded-lg border-0 px-3 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand" />
          </form>
    </>
  );

  return (
    <div>
      <div className="hero-bg px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{association ? `Members of ${association.name}` : city ? `Computer stores in ${city.name}` : 'Find computer stores & IT services'}</h1>
          {city?.associationName && <p className="mt-1 text-sm text-stone-300">Local association: {city.associationName}{city.associationCode ? ` (${city.associationCode})` : ''} · {city.zone}</p>}
          <div className="mt-6"><SearchBar cities={cities} categories={categories} defaults={sp} /></div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[240px_1fr] lg:gap-8">
        <details className="group rounded-2xl border border-slate-200 bg-white text-sm lg:hidden">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-slate-900">Filters<span className="text-slate-400 transition group-open:rotate-180">▾</span></summary>
          <div className="space-y-6 border-t border-slate-100 p-4">{filters}</div>
        </details>
        <aside className="hidden space-y-6 text-sm lg:block">{filters}</aside>
        <section>
          <p className="mb-4 text-sm text-slate-500">{result.total} {result.total === 1 ? 'store' : 'stores'} found</p>
          {result.items.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.items.map((s) => <StoreCard key={s.id} store={s} />)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="font-medium text-slate-900">No stores match these filters</p>
              <Link href="/stores" className="mt-2 inline-block text-sm font-medium text-brand">Clear filters</Link>
            </div>
          )}
          {result.total > result.page * result.pageSize && (
            <div className="mt-6 text-center"><Link className="text-sm font-semibold text-brand" href={`/stores?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(result.page + 1) })}`}>Load more</Link></div>
          )}
        </section>
      </div>
    </div>
  );
}
