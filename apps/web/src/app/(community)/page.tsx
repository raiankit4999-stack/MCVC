import Link from 'next/link';
import { HeroArt } from '@/components/hero-art';
import { Icon, IconName } from '@/components/icons';
import { StoreCard } from '@/components/store-card';
import { api } from '@/lib/server-api';
import type { Category, City, StoreCard as S } from '@/lib/types';
import { SearchBar } from './search-bar';

export const dynamic = 'force-dynamic';

const STRIP: { label: string; icon: IconName; href: string }[] = [
  { label: 'Laptops & Desktops', icon: 'laptop', href: '/stores?category=laptops-and-notebooks' },
  { label: 'Computer Repair', icon: 'wrench', href: '/stores?category=laptop-repair' },
  { label: 'IT Support & AMC', icon: 'shield', href: '/stores?category=amc-and-it-maintenance' },
  { label: 'Printers & Peripherals', icon: 'printer', href: '/stores?category=printers-and-scanners' },
  { label: 'Networking & CCTV', icon: 'wifi', href: '/stores?category=cctv-and-networking' },
  { label: 'Software & Licensing', icon: 'disc', href: '/stores?category=software-and-licensing' },
];

export default async function Home() {
  const [community, cities, categories, featured] = await Promise.all([
    api<{ name: string; stats: { stores: number; cities: number } }>('/community'),
    api<City[]>('/cities'),
    api<Category[]>('/categories'),
    api<S[]>('/stores-featured'),
  ]);
  const repair = featured.filter((s) => s.categories.some((c) => c.kind === 'SERVICE'));

  return (
    <>
      <section className="hero-bg relative overflow-hidden pb-24 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:pt-20">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">India&apos;s computer community network</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Find trusted computer stores, laptop shops &amp; IT services near you
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              A verified network of computer retailers, laptop stores, repair centres and IT service providers in your city.
            </p>
            <div className="mt-8 max-w-3xl">
              <SearchBar cities={cities} categories={categories} />
            </div>
          </div>
          <HeroArt className="hidden w-full max-w-xl justify-self-end drop-shadow-2xl lg:block" />
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 sm:px-6">
        <nav aria-label="Browse by category" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 md:grid-cols-6">
          {STRIP.map((c) => (
            <Link key={c.label} href={c.href} className="flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-center text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand">
              <Icon name={c.icon} className="h-7 w-7 text-navy" />
              {c.label}
            </Link>
          ))}
        </nav>
      </div>

      <section id="cities" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-navy">Browse stores by city</h2>
          <Link href="/stores" className="flex items-center gap-1 text-sm font-semibold text-brand">View all <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cities.map((c, i) => (
            <Link key={c.slug} href={`/stores?city=${c.slug}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card hover:border-brand">
              <span className={`grid h-12 w-12 place-items-center rounded-xl text-white ${['bg-gradient-to-br from-amber-500 to-orange-600', 'bg-gradient-to-br from-blue-500 to-indigo-600', 'bg-gradient-to-br from-emerald-500 to-teal-600', 'bg-gradient-to-br from-violet-500 to-fuchsia-600', 'bg-gradient-to-br from-sky-500 to-cyan-600'][i % 5]}`}>
                <Icon name="map" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 group-hover:text-brand">{c.name}</span>
                <span className="text-xs text-slate-500">{c.storeCount} {c.storeCount === 1 ? 'store' : 'stores'}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-navy">Featured community members</h2>
        <p className="mt-1 text-sm text-slate-500">Verified computer and laptop stores with great customer ratings.</p>
        {featured.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">The first stores are joining soon.</p>
        )}
      </section>

      {repair.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-navy">Repair &amp; technical support</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{repair.slice(0, 3).map((s) => <StoreCard key={s.id} store={s} />)}</div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-navy p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Why join the community?</h2>
            <p className="mt-3 text-slate-300">Your own branded website and domain, a complete computer-shop ERP and CRM, and discovery by customers across the network — your customers and data stay yours.</p>
            <Link href="/join" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold hover:bg-brand-700">
              Become a member <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ['globe', 'Branded website', 'Custom domain, SSL, products and bookings'],
              ['receipt', 'GST billing & POS', 'Invoices, payments and FY numbering'],
              ['wrench', 'Repair job cards', 'Intake, quotes, QR tracking'],
              ['box', 'Serial-level inventory', 'Stock ledger, purchases, warranty'],
            ].map(([icon, t, d]) => (
              <li key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <Icon name={icon as IconName} className="h-6 w-6 text-blue-300" />
                <p className="mt-2 font-semibold">{t}</p>
                <p className="text-sm text-slate-400">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-3 gap-4 px-4 pt-16 text-center sm:px-6">
        {[
          [community.stats.stores, 'Member stores'],
          [community.stats.cities, 'Cities'],
          [categories.length, 'Business categories'],
        ].map(([v, l]) => (
          <div key={l as string}>
            <div className="text-3xl font-extrabold text-navy">{v}</div>
            <div className="text-sm text-slate-500">{l}</div>
          </div>
        ))}
      </section>
    </>
  );
}
