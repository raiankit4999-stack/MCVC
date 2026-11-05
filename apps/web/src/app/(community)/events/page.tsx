import Link from 'next/link';
import { Icon, IconName } from '@/components/icons';
import { CountUp, Reveal } from '@/components/motion';
import { api } from '@/lib/server-api';
import type { Network } from '@/lib/types';
import { FeaturedMosaic, PhotoMasonry, Programmes } from './gallery';

export const metadata = { title: 'Events & gallery' };
export const dynamic = 'force-dynamic';

const UPCOMING: Record<string, { icon: IconName; blurb: string; tag: string }> = {
  'presidents-conclave-2026': { icon: 'users', blurb: 'City association presidents meet to align on the year ahead, with awards for associations and members.', tag: 'Leadership' },
  'celebration-2026': { icon: 'star', blurb: 'The federation celebrates its members, partners and milestones together.', tag: 'Community' },
  'fitagwomaniya-2026': { icon: 'user', blurb: 'Celebrating and encouraging women entrepreneurs in the IT trade of Gujarat.', tag: 'Women in IT' },
};

/** "Vapi Information Technology Association : 5th January 2021" → title + date + year */
function parseCaption(c: string) {
  const [title, ...rest] = c.split(/\s*:\s*(?=\d)|\s+-\s+(?=\d{4})/);
  const date = rest.join(' ').trim() || null;
  const year = (c.match(/(20\d{2})/) ?? [])[1] ?? null;
  return { title: title.trim(), date, year };
}

export default async function Events() {
  const n = await api<Network>('/community/network');
  const featured = n.events.find((e) => e.images.length) ?? null;
  const upcoming = n.events.filter((e) => e !== featured);
  const programmes = n.gallery.map((g) => ({ ...parseCaption(g.caption), images: g.images }));
  const wall = n.photoWall ?? [];
  const photoCount = wall.length + (featured?.images.length ?? 0);
  const hero = (n.photoWall ?? []).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-35 sm:grid-cols-8" aria-hidden="true">
          {hero.map((src, i) => <img key={src} src={src} alt="" className={`h-full min-h-[220px] w-full object-cover ${i % 2 ? 'animate-kenburns' : ''}`} />)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-100 ring-1 ring-white/15">Events &amp; gallery</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Where Gujarat&apos;s IT trade <span className="bg-gradient-to-r from-can-amber via-can-orange to-[#ff7a59] bg-clip-text text-transparent">comes together</span>
          </h1>
          <p className="mt-4 max-w-2xl text-stone-300">Conclaves, AGMs, award ceremonies, expos and association programmes across the network.</p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
            {([[n.events.length, 'Events 2026–28'], [programmes.length, 'Programmes'], [photoCount, 'Photos']] as [number, string][]).map(([v, l]) => (
              <div key={l}><dd className="text-3xl font-extrabold"><CountUp value={v} /></dd><dt className="text-sm text-stone-400">{l}</dt></div>
            ))}
          </dl>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="On this page">
            {[['#featured', 'AGM 2026'], ['#upcoming', 'Events 2026–28'], ['#programmes', 'Programmes'], ['#photos', 'Photo wall']].map(([h, l]) => (
              <a key={h} href={h} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">{l}</a>
            ))}
          </nav>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section id="featured" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-14 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.6fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-can-orange" />Featured</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{featured.title}</h2>
              <p className="mt-3 text-slate-600">The federation&apos;s Annual General Meeting brings together office bearers and members from every association to review the year, plan ahead and recognise contributions.</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Icon name="layers" className="h-4 w-4" />{featured.images.length} photos · tap to view</p>
            </Reveal>
            <Reveal delay={100}><FeaturedMosaic photos={featured.images} title={featured.title} /></Reveal>
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section id="upcoming" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Calendar</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Events 2026–28</h2>
        </Reveal>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {upcoming.map((e, i) => {
            const meta = UPCOMING[e.slug] ?? { icon: 'calendar' as IconName, blurb: 'Details will be announced soon.', tag: 'Event' };
            return (
              <Reveal as="li" key={e.slug} delay={i * 90} className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-can-red via-can-orange to-can-amber p-[1px]">
                <div className="flex h-full flex-col rounded-[23px] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-can-red via-can-orange to-can-amber text-white shadow-lg transition group-hover:scale-110"><Icon name={meta.icon} className="h-6 w-6" /></span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{meta.tag}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-ink">{e.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{meta.blurb}</p>
                  <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700"><Icon name="clock" className="h-4 w-4" />Dates to be announced</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* Programmes */}
      <section id="programmes" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Archive</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Association programmes &amp; expos</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Association meets across Gujarat, international ICT expos, Vibrant Gujarat and networking meets with trade bodies.</p>
        </Reveal>
        <div className="mt-6"><Programmes items={programmes} /></div>
      </section>

      {/* Photo wall */}
      <section id="photos" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Photo wall</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Moments from the network</h2>
        </Reveal>
        <div className="mt-6"><PhotoMasonry photos={wall.map((src) => ({ src }))} /></div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-ink p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Organising an event for your association?</h2>
            <p className="mt-1 text-stone-300">Share the details and photos with FITAG to feature it on CAN.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="mailto:secretary@fitag.in?subject=Event%20for%20CAN" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold active:scale-[.97]"><Icon name="calendar" className="h-4 w-4" />Submit an event</a>
            <Link href="/associations" className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/10">Associations</Link>
          </div>
        </div>
      </section>
    </>
  );
}
