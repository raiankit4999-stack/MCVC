import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandBadges, BrandLegend } from '@/components/brand-badges';
import { Icon } from '@/components/icons';
import { storeUrl } from '@/components/store-card';
import { Badge } from '@/components/ui';
import { money } from '@/lib/format';
import { apiOrNull } from '@/lib/server-api';
import type { StoreCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Profile extends StoreCard {
  email: string;
  about?: string;
  businessHours: { day: number; open: string; close: string }[];
  whatsappNumber?: string;
  services: { id: string; name: string; description: string | null; price: string; priceIsStarting: boolean }[];
  products: { id: string; name: string; brand: string | null; sellingPrice: string; mrp: string; inStock: boolean; specs: Record<string, string> }[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = await apiOrNull<Profile>(`/stores/${(await params).slug}`);
  return { title: s ? `${s.name} — ${s.area.name}, ${s.city.name}` : 'Store' };
}

export default async function StoreProfile({ params }: { params: Promise<{ slug: string }> }) {
  const s = await apiOrNull<Profile>(`/stores/${(await params).slug}`);
  if (!s) notFound();
  const site = storeUrl(s);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-slate-500"><Link href="/stores" className="hover:text-brand">Stores</Link> / <Link href={`/stores?city=${s.city.slug}`} className="hover:text-brand">{s.city.name}</Link> / {s.name}</nav>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-white" style={{ background: s.primaryColor }}>{s.name[0]}</span>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">{s.name} {s.isVerified && <Badge tone="blue"><Icon name="shield" className="h-3.5 w-3.5" /> Verified</Badge>}</h1>
              {s.association ? <Link href={`/associations/${s.association.slug}`} className="text-sm font-medium text-brand-700 hover:underline">Member · {s.association.name}{s.association.code ? ` (${s.association.code})` : ''}</Link> : s.tagline && <p className="text-slate-600">{s.tagline}</p>}
              {s.ratingCount > 0 && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Icon name="star" className="h-4 w-4 fill-amber-400 text-amber-400" /> {s.rating.toFixed(1)} · {s.ratingCount} reviews</p>}
            </div>
          </div>
          {s.about && <p className="mt-6 max-w-3xl text-slate-700">{s.about}</p>}
          {!s.websitePublished && s.association && !s.phone && (
            <p className="mt-6 max-w-2xl rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">This listing is from the {s.association.code ?? 'association'} member list. Are you the owner? <Link href={`/join?association=${s.association.slug}`} className="font-semibold underline">Claim it on CAN</Link> to add products, services, contact details and your own website.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">{s.categories.map((c) => <Badge key={c.slug} tone={c.kind === 'SERVICE' ? 'slate' : 'orange'}>{c.name}</Badge>)}</div>

          {s.brandServices?.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-ink">Brands we service</h2>
              <BrandBadges items={s.brandServices} size="md" className="mt-3" />
              <details className="mt-3 text-sm text-slate-500"><summary className="cursor-pointer">What do these badges mean?</summary><BrandLegend className="mt-3" /></details>
            </section>
          )}
          {s.services.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-ink">Services</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {s.services.map((v) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex justify-between gap-2"><p className="font-medium">{v.name}</p><p className="text-sm font-semibold text-ink">{v.priceIsStarting ? 'from ' : ''}{money(v.price, true)}</p></div>
                    {v.description && <p className="mt-1 text-sm text-slate-500">{v.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {s.products.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-ink">Product catalogue</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.products.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="line-clamp-2 font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{[p.specs.processor, p.specs.ram, p.specs.storage].filter(Boolean).join(' · ')}</p>
                    <p className="mt-2"><span className="font-semibold text-ink">{money(p.sellingPrice, true)}</span> {Number(p.mrp) > Number(p.sellingPrice) && <span className="text-xs text-slate-400 line-through">{money(p.mrp, true)}</span>}</p>
                    <p className={`mt-1 text-xs font-medium ${p.inStock ? 'text-success' : 'text-slate-400'}`}>{p.inStock ? 'In stock' : 'Out of stock'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2"><Icon name="pin" className="h-4 w-4 shrink-0 text-slate-400" />{s.addressLine}</li>
              {s.phone && <li className="flex gap-2"><Icon name="phone" className="h-4 w-4 shrink-0 text-slate-400" /><a href={`tel:${s.phone}`} className="text-brand">{s.phone}</a></li>}
              <li className="flex gap-2"><Icon name="clock" className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{s.businessHours.length ? s.businessHours.map((h) => `${DAYS[h.day]} ${h.open}–${h.close}`).join(', ') : 'Hours not listed'}</span>
              </li>
            </ul>
            {s.websitePublished && (
              <div className="mt-5 grid gap-2">
                <a href={`${site}/book`} className="inline-flex h-10 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-700">Book a service</a>
                <a href={site} className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Visit store website</a>
              </div>
            )}
            {s.whatsappNumber && <a href={`https://wa.me/${s.whatsappNumber.replace('+', '')}`} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white"><Icon name="whatsapp" className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </aside>
      </div>
    </div>
  );
}
