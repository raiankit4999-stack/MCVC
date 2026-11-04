import Link from 'next/link';
import { HeroArt } from '@/components/hero-art';
import { Icon, IconName } from '@/components/icons';
import { StoreCard } from '@/components/store-card';
import { api } from '@/lib/server-api';
import { ZONE_ORDER, type Category, type City, type CommunityProfile, type StoreCard as S } from '@/lib/types';
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
    api<CommunityProfile>('/community'),
    api<City[]>('/cities'),
    api<Category[]>('/categories'),
    api<S[]>('/stores-featured'),
  ]);
  const repair = featured.filter((s) => s.categories.some((c) => c.kind === 'SERVICE'));
  const parent = community.settings.parent;
  const zones = ZONE_ORDER.map((z) => [z, cities.filter((c) => c.zone === z)] as const)
    .concat([['Other', cities.filter((c) => !c.zone || !ZONE_ORDER.includes(c.zone))] as const])
    .filter(([, l]) => l.length > 0);

  return (
    <>
      <section className="hero-bg relative overflow-hidden pb-24 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:pt-20">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">Computer Association Network · Gujarat</span>
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
              <Icon name={c.icon} className="h-7 w-7 text-ink" />
              {c.label}
            </Link>
          ))}
        </nav>
      </div>


      <section id="cities" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Browse stores by city</h2>
            <p className="mt-1 text-sm text-slate-500">{cities.length} cities across Gujarat, each served by its local IT association.</p>
          </div>
          <Link href="/stores" className="flex items-center gap-1 text-sm font-semibold text-brand">All stores <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map(([zone, list]) => (
            <div key={zone}>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand"><span className="h-1.5 w-1.5 rounded-full bg-can-orange" />{zone}</h3>
              <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-card">
                {list.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/stores?city=${c.slug}`} className="group flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-50">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 group-hover:text-brand">{c.name}</span>
                        {c.associationName && <span className="block truncate text-xs text-slate-500">{c.associationName}{c.associationCode ? ` (${c.associationCode})` : ''}</span>}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${c.storeCount ? 'bg-brand-50 text-brand-700' : 'text-slate-400'}`}>{c.storeCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Featured community members</h2>
        <p className="mt-1 text-sm text-slate-500">Verified computer and laptop stores with great customer ratings.</p>
        {featured.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">The first stores are joining soon.</p>
        )}
      </section>

      {repair.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">Repair &amp; technical support</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{repair.slice(0, 3).map((s) => <StoreCard key={s.id} store={s} />)}</div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-12 lg:grid-cols-2">
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

      {parent && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <div className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card lg:grid-cols-[1fr_1.4fr]">
            <div>
              <img src="/brand/fitag-logo.png" alt="FITAG — Federation of IT Associations of Gujarat" className="h-8 w-auto" />
              <p className="mt-4 text-slate-600">CAN is built for the member associations of <strong>{parent.shortName}</strong>, the parent body of the IT trade in Gujarat. <em>{parent.motto}.</em></p>
              <Link href="/about" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">About CAN &amp; FITAG <Icon name="arrowRight" className="h-4 w-4" /></Link>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                [String(parent.stats.associations), 'Member associations'],
                [parent.stats.partners, 'IT partners'],
                [parent.stats.annualBusiness, 'Annual IT hardware business'],
                [String(community.stats.stores), 'Stores on CAN'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-brand-50 p-4">
                  <dt className="text-xs text-slate-600">{l}</dt>
                  <dd className="mt-1 text-xl font-extrabold text-brand-700">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </>
  );
}
