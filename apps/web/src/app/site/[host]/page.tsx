import Link from 'next/link';
import { HeroArt } from '@/components/hero-art';
import { Icon, IconName } from '@/components/icons';
import { money } from '@/lib/format';
import { api } from '@/lib/server-api';
import { basePath, getStore, hostFrom } from './data';

export interface PubProduct { id: string; name: string; brand: string | null; imageUrl: string | null; mrp: string; sellingPrice: string; condition: string; specs: Record<string, string>; inStock: boolean; category: { name: string } | null }
export interface PubService { id: string; name: string; slug: string; description: string | null; price: string; priceIsStarting: boolean; durationMinutes: number; isBookable: boolean }

const TRUST: [IconName, string, string][] = [['shield', 'Genuine products', 'Authorised partners'], ['wrench', 'Expert repair', 'Certified technicians'], ['check', 'Warranty support', 'On products & services'], ['truck', 'Quick service', 'Pickup & delivery']];

export function ProductTile({ p, base }: { p: PubProduct; base: string }) {
  const off = Number(p.mrp) > Number(p.sellingPrice) ? Math.round((1 - Number(p.sellingPrice) / Number(p.mrp)) * 100) : 0;
  return (
    <Link href={`${base}/products/${p.id}`} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-lg">
      <div className="relative grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full rounded-xl object-contain" /> : <Icon name="laptop" className="h-14 w-14 text-slate-300" />}
        {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">-{off}%</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-[var(--brand)]">{p.name}</p>
      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{[p.specs.processor, p.specs.ram, p.specs.storage].filter(Boolean).join(' · ')}</p>
      <p className="mt-auto pt-3"><span className="text-lg font-bold text-slate-900">{money(p.sellingPrice, true)}</span> {off > 0 && <span className="text-xs text-slate-400 line-through">{money(p.mrp, true)}</span>}</p>
      <p className={`text-xs font-medium ${p.inStock ? 'text-green-600' : 'text-slate-400'}`}>{p.inStock ? 'In stock' : 'Out of stock'}</p>
    </Link>
  );
}

export default async function StoreHome({ params }: { params: Promise<{ host: string }> }) {
  const host = hostFrom((await params).host);
  const [s, base, products, services] = await Promise.all([getStore(host), basePath(host), api<{ items: PubProduct[] }>('/public/store/products?pageSize=8', { host }), api<PubService[]>('/public/store/services', { host })]);
  return (
    <>
      <section className="relative overflow-hidden text-white" style={{ background: `radial-gradient(60% 80% at 80% 40%, color-mix(in srgb, var(--brand) 55%, transparent), transparent 70%), linear-gradient(120deg, #0a1630, #0f1f3d 60%, color-mix(in srgb, var(--brand) 35%, #0f1f3d))` }}>
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 pb-24 pt-16 lg:grid-cols-2">
          <div>
            {s.branding.tagline && <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">{s.branding.tagline}</span>}
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{s.branding.heroHeadline ?? s.name}</h1>
            <p className="mt-4 max-w-lg text-lg text-slate-300">Buy, repair &amp; upgrade — all in one place in {s.city}.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`${base}/products`} className="inline-flex h-12 items-center gap-2 rounded-lg px-6 font-semibold text-white" style={{ background: 'var(--brand)' }}>Shop now <Icon name="arrowRight" className="h-4 w-4" /></Link>
              <Link href={`${base}/book`} className="inline-flex h-12 items-center gap-2 rounded-lg px-6 font-semibold ring-1 ring-white/40 hover:bg-white/10"><Icon name="calendar" className="h-4 w-4" /> Book a repair</Link>
            </div>
          </div>
          {s.branding.heroImageUrl ? <img src={s.branding.heroImageUrl} alt="" className="hidden max-h-80 justify-self-end rounded-2xl object-cover lg:block" /> : <HeroArt className="hidden w-full max-w-lg justify-self-end lg:block" />}
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
        <ul className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5 md:grid-cols-4">
          {TRUST.map(([i, t, d]) => (
            <li key={t} className="flex items-center gap-3"><Icon name={i} className="h-8 w-8 shrink-0" style={{ color: 'var(--brand)' }} /><span><span className="block text-sm font-semibold text-slate-900">{t}</span><span className="text-xs text-slate-500">{d}</span></span></li>
          ))}
        </ul>
      </div>

      {services.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-16">
          <div className="flex items-end justify-between"><h2 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Repair &amp; IT services</h2><Link href={`${base}/services`} className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>All services →</Link></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.slice(0, 4).map((v) => (
              <div key={v.id} className="rounded-2xl border border-slate-200 p-5">
                <Icon name="wrench" className="h-7 w-7" style={{ color: 'var(--brand)' }} />
                <p className="mt-3 font-semibold">{v.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{v.description}</p>
                <p className="mt-3 text-sm font-semibold">{v.priceIsStarting ? 'From ' : ''}{money(v.price, true)}</p>
                {v.isBookable && <Link href={`${base}/book?service=${v.id}`} className="mt-3 inline-block text-sm font-semibold" style={{ color: 'var(--brand)' }}>Book now →</Link>}
              </div>
            ))}
          </div>
        </section>
      )}

      {products.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-16">
          <div className="flex items-end justify-between"><h2 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Latest products</h2><Link href={`${base}/products`} className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>View all →</Link></div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{products.items.map((p) => <ProductTile key={p.id} p={p} base={base} />)}</div>
        </section>
      )}

      <section id="about" className="mx-auto mt-16 grid max-w-7xl gap-8 px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>About {s.name}</h2>
          <p className="mt-3 whitespace-pre-line text-slate-600">{s.branding.about ?? `${s.name} is a computer store in ${s.area}, ${s.city}.`}</p>
          <p className="mt-4 flex items-center gap-1 text-sm text-slate-600"><Icon name="star" className="h-4 w-4 fill-amber-400 text-amber-400" /> {s.rating.toFixed(1)} from {s.ratingCount} customer reviews</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <p className="font-semibold">Track your repair</p>
          <p className="mt-1 text-sm text-slate-600">Use the tracking link we sent you on WhatsApp/SMS to see live status, approve quotations and view invoices.</p>
          <p className="mt-4 font-semibold">Visit us</p>
          <p className="mt-1 text-sm text-slate-600">{s.addressLine}</p>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(s.addressLine)}`} className="mt-2 inline-block text-sm font-semibold" style={{ color: 'var(--brand)' }}>Get directions →</a>
        </div>
      </section>
    </>
  );
}
