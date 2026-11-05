import { api } from '@/lib/server-api';
import type { Network } from '@/lib/types';

export const metadata = { title: 'Events & gallery' };
export const dynamic = 'force-dynamic';

export default async function Events() {
  const n = await api<Network>('/community/network');
  return (
    <>
      <section className="hero-bg px-4 pb-12 pt-12 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Events &amp; gallery</h1>
          <p className="mt-2 max-w-2xl text-stone-300">Conclaves, AGMs, celebrations and programmes across the associations of Gujarat.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
        <section>
          <h2 className="text-xl font-bold text-ink">Events 2026–28</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {n.events.map((e) => (
              <article key={e.slug} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                {e.images[0] ? <img src={e.images[0]} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-can-red via-can-orange to-can-amber text-center text-lg font-extrabold text-white"><span className="px-4">{e.title}</span></div>}
                <div className="p-4"><h3 className="font-semibold text-slate-900">{e.title}</h3><p className="text-xs text-slate-500">{e.images.length ? `${e.images.length} photos` : 'Details coming soon'}</p></div>
              </article>
            ))}
          </div>
          {n.events.filter((e) => e.images.length > 1).map((e) => (
            <div key={e.slug} className="mt-6">
              <h3 className="font-semibold text-slate-900">{e.title}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{e.images.map((src) => <img key={src} src={src} alt={`${e.title} photo`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>
            </div>
          ))}
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">Association programmes</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {n.gallery.map((g) => (
              <figure key={g.caption} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                <div className="grid grid-cols-3 gap-0.5">{g.images.map((src, i) => <img key={src} src={src} alt="" loading="lazy" className={`${i === 0 ? 'col-span-3 aspect-[16/9]' : 'aspect-square'} w-full object-cover`} />)}</div>
                <figcaption className="p-4 text-sm font-medium text-slate-800">{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
