import Link from 'next/link';
import { AssociationCard } from '@/components/association-card';
import { AssociationBadge } from '@/components/association-card';
import { Icon, IconName } from '@/components/icons';
import { CountUp, Reveal } from '@/components/motion';
import { AdvisoryCommittee, CoreCommittee, LeadersDirectory } from '@/components/people';
import { PhotoWall, Ticker } from '@/components/photo-wall';
import { STOCK_HERO_IMAGES } from '@/lib/hero';
import { StoreCard } from '@/components/store-card';
import { api } from '@/lib/server-api';
import { ZONE_ORDER, type Association, type Category, type City, type CommunityProfile, type Network, type StoreCard as S } from '@/lib/types';
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
  const [community, cities, categories, featured, associations, network] = await Promise.all([
    api<CommunityProfile>('/community'),
    api<City[]>('/cities'),
    api<Category[]>('/categories'),
    api<S[]>('/stores-featured'),
    api<Association[]>('/associations'),
    api<Network>('/community/network'),
  ]);
  const parent = community.settings.parent;
  const members = associations.reduce((n, a) => n + a.memberCount, 0);
  const zones = ZONE_ORDER.map((z) => [z, associations.filter((a) => a.zone === z).sort((a, b) => b.memberCount - a.memberCount)] as const).filter(([, l]) => l.length);
  const core = network.team?.filter((t) => t.section === 'Core Committee') ?? [];
  const advisory = network.team?.filter((t) => t.section === 'Advisory Committee') ?? [];
  const leaders = network.leaders ?? [];
  const leaderZones = ZONE_ORDER.filter((z) => leaders.some((l) => l.zone === z));
  const wall = [...STOCK_HERO_IMAGES, ...(network.photoWall ?? [])];
  const event = network.events?.find((e) => e.images.length);

  return (
    <>
      <section className="hero-bg relative overflow-hidden pb-24 text-white">
        <div className="mx-auto grid grid-cols-1 max-w-7xl items-center gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pt-16">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-100 ring-1 ring-white/15">Computer Association Network · Gujarat</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Gujarat&apos;s IT associations,<br className="hidden sm:block" /> <span className="bg-gradient-to-r from-can-amber via-can-orange to-[#ff7a59] bg-clip-text text-transparent">one trusted network</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-stone-300">
              Find verified computer stores, laptop shops, repair centres and IT service providers from {associations.length} member associations across {cities.length} cities.
            </p>
            <div className="mt-8 max-w-3xl"><SearchBar cities={cities} categories={categories} /></div>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div><dt className="sr-only">Associations</dt><dd><span className="text-2xl font-extrabold"><CountUp value={associations.length} /></span> <span className="text-stone-400">associations</span></dd></div>
              <div><dt className="sr-only">Member businesses</dt><dd><span className="text-2xl font-extrabold"><CountUp value={members} /></span> <span className="text-stone-400">member businesses</span></dd></div>
              <div><dt className="sr-only">Cities</dt><dd><span className="text-2xl font-extrabold"><CountUp value={cities.length} /></span> <span className="text-stone-400">cities</span></dd></div>
              <div><dt className="sr-only">Leaders</dt><dd><span className="text-2xl font-extrabold"><CountUp value={core.length + advisory.length + leaders.length} /></span> <span className="text-stone-400">leaders</span></dd></div>
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="animate-glow pointer-events-none absolute -inset-10 rounded-full bg-can-orange/25 blur-3xl" />
            <PhotoWall photos={wall} className="relative" />
            <div className="animate-float absolute -left-10 bottom-16 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 text-ink shadow-2xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Icon name="users" /></span>
              <span><span className="block text-lg font-extrabold leading-none">4,200+</span><span className="text-xs text-slate-500">IT partners across Gujarat</span></span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 sm:px-6">
        <nav aria-label="Browse by category" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 md:grid-cols-6">
          {STRIP.map((c) => (
            <Link key={c.label} href={c.href} className="flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-center text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand">
              <Icon name={c.icon} className="h-7 w-7 text-can-orange" />
              {c.label}
            </Link>
          ))}
        </nav>
      </div>

      {wall.length > 0 && (
        <div className="mt-8 lg:hidden">
          <Ticker>{wall.slice(0, 12).map((src) => <img key={src} src={src} alt="" className="h-36 w-28 rounded-2xl object-cover" />)}</Ticker>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6" aria-label="Member associations">
        <Ticker>
          {associations.map((a) => (
            <Link key={a.slug} href={`/associations/${a.slug}`} className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm shadow-card hover:border-brand-100">
              <AssociationBadge code={a.code} slug={a.slug} />
              <span><span className="block font-semibold text-slate-900">{a.code ?? a.city.name}</span><span className="block text-xs text-slate-500">{a.city.name}</span></span>
            </Link>
          ))}
        </Ticker>
      </section>

      <section id="associations" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Member associations by zone</h2>
            <p className="mt-1 text-sm text-slate-500">Each city&apos;s IT trade association brings its members onto CAN.</p>
          </div>
          <Link href="/associations" className="flex items-center gap-1 text-sm font-semibold text-brand">All {associations.length} associations <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 space-y-8">
          {zones.map(([zone, list]) => (
            <div key={zone}>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand"><span className="h-1.5 w-1.5 rounded-full bg-can-orange" />{zone}</h3>
                {list.length > 3 && <Link href={`/associations?zone=${encodeURIComponent(zone)}`} className="text-xs font-semibold text-slate-500 hover:text-brand">+{list.length - 3} more</Link>}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.slice(0, 3).map((a) => <AssociationCard key={a.slug} a={a} />)}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="people" className="mt-16 bg-gradient-to-b from-white to-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-widest text-can-orange">Our people</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">The leaders behind the network</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{parent?.shortName ?? 'FITAG'}&apos;s core committee, past presidents and every city association&apos;s president and secretary — with their published contact details.</p>
          </Reveal>

          {core.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-bold text-ink">Core committee</h3>
              <div className="mt-4"><CoreCommittee team={core} /></div>
            </div>
          )}

          {advisory.length > 0 && (
            <div className="mt-14">
              <h3 className="text-lg font-bold text-ink">Past presidents &amp; advisory committee</h3>
              <div className="mt-4"><AdvisoryCommittee team={advisory} /></div>
            </div>
          )}

          {leaders.length > 0 && (
            <div className="mt-14">
              <h3 className="text-lg font-bold text-ink">City presidents &amp; secretaries</h3>
              <p className="mt-1 text-sm text-slate-500">{leaders.length} office bearers across {leaderZones.length} zones. Choose a zone or search.</p>
              <div className="mt-4"><LeadersDirectory leaders={leaders} zones={leaderZones} /></div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Featured members</h2>
            <p className="mt-1 text-sm text-slate-500">Stores with their own CAN website, billing and repair tracking.</p>
          </div>
          <Link href="/stores" className="flex items-center gap-1 text-sm font-semibold text-brand">Store directory <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((s) => <StoreCard key={s.id} store={s} />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight">Why join CAN?</h2>
            <p className="mt-3 text-stone-300">Every member business gets its own branded website and domain, a complete computer-shop ERP and CRM, and discovery by customers across the network — your customers and data stay yours.</p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([['globe', 'Branded website', 'Custom domain, products, bookings'], ['receipt', 'GST billing & POS', 'Invoices, payments, FY numbering'], ['wrench', 'Repair job cards', 'Intake, quotes, QR tracking'], ['box', 'Serial-level inventory', 'Stock ledger, purchases, warranty']] as [IconName, string, string][]).map(([icon, t, d]) => (
                <li key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"><Icon name={icon} className="h-6 w-6 text-can-amber" /><p className="mt-2 font-semibold">{t}</p><p className="text-sm text-stone-400">{d}</p></li>
              ))}
            </ul>
            <Link href="/join" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold hover:bg-brand-700">Become a member <Icon name="arrowRight" className="h-4 w-4" /></Link>
          </div>
          <div className="flex flex-col gap-6">
            {event && (
              <Link href="/events" className="group relative block flex-1 overflow-hidden rounded-3xl">
                <img src={event.images[0]} alt="" className="h-full max-h-72 w-full object-cover transition group-hover:scale-[1.02]" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white"><span className="text-xs uppercase tracking-wider text-can-amber">Events</span><span className="block text-lg font-bold">{event.title}</span></span>
              </Link>
            )}
            {parent && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                <img src="/brand/fitag-logo.png" alt="FITAG — Federation of IT Associations of Gujarat" className="h-7 w-auto" />
                <p className="mt-3 text-sm text-slate-600">CAN is built for the member associations of {parent.shortName} — {parent.stats.associations} associations, {parent.stats.partners} IT partners, {parent.stats.annualBusiness} of annual IT hardware business. <em>{parent.motto}.</em></p>
                <Link href="/about" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">About CAN &amp; FITAG <Icon name="arrowRight" className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
