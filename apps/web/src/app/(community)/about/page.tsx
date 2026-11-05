import Link from 'next/link';
import { AssociationBadge } from '@/components/association-card';
import { CanMark } from '@/components/brand';
import { Icon, IconName } from '@/components/icons';
import { CountUp, Reveal } from '@/components/motion';
import { Avatar, CoreCommittee } from '@/components/people';
import { api } from '@/lib/server-api';
import { ZONE_ORDER, type Association, type CommunityProfile, type Network } from '@/lib/types';

export const metadata = { title: 'About CAN & FITAG' };
export const dynamic = 'force-dynamic';

const AGENDA_ICONS: IconName[] = ['chart', 'layers', 'users', 'shield', 'check'];
const AGENDA_COLORS = ['#C1272D', '#E0461F', '#F15A29', '#F47A23', '#F7941D'];

export default async function About() {
  const [community, network, associations] = await Promise.all([
    api<CommunityProfile>('/community'),
    api<Network>('/community/network'),
    api<Association[]>('/associations'),
  ]);
  const p = community.settings.parent;
  const core = network.team?.filter((t) => t.section === 'Core Committee') ?? [];
  const advisory = network.team?.filter((t) => t.section === 'Advisory Committee') ?? [];
  const past = advisory.filter((t) => t.years).sort((a, b) => (a.years! < b.years! ? -1 : 1));
  const others = advisory.filter((t) => !t.years);
  const members = associations.reduce((n, a) => n + a.memberCount, 0);
  const photos = (network.photoWall ?? []).slice(0, 5);
  const zones = ZONE_ORDER.map((z) => ({ zone: z, list: associations.filter((a) => a.zone === z) })).filter((z) => z.list.length);

  const sections: [string, string][] = [['story', 'Our story'], ['agenda', 'Agenda'], ['timeline', 'Timeline'], ['network', 'Network'], ['leadership', 'Leadership'], ['contact', 'Contact']];

  return (
    <>
      {/* Hero */}
      <section className="hero-bg overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-100 ring-1 ring-white/15">
              <CanMark className="h-3.5 w-auto" title="" /> About CAN
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Built by Gujarat&apos;s IT traders,<br className="hidden sm:block" /> <span className="bg-gradient-to-r from-can-amber via-can-orange to-[#ff7a59] bg-clip-text text-transparent">for Gujarat&apos;s IT traders</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-stone-300 sm:text-lg">
              Computer Association Network brings every city&apos;s IT trade association onto one platform — so customers find trusted local stores, and every member business runs on its own website, billing and repair system.
            </p>
            {p && (
              <a href={p.url} target="_blank" rel="noreferrer" className="mt-7 inline-flex flex-col items-start gap-2 rounded-2xl bg-white px-4 py-3 text-ink shadow-xl ring-1 ring-black/5 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3">
                <img src="/brand/fitag-logo.png" alt="FITAG — Federation of IT Associations of Gujarat" className="h-6 w-auto max-w-full" />
                <span className="text-xs text-slate-600 sm:border-l sm:border-slate-200 sm:pl-3">An initiative for the<br className="hidden sm:block" /> member associations of {p.shortName}</span>
              </a>
            )}
          </div>
          {photos.length >= 4 && (
            <div className="relative mx-auto grid h-[340px] w-full max-w-md grid-cols-6 grid-rows-6 gap-3 sm:h-[420px]" aria-hidden="true">
              <img src={photos[0]} alt="" className="animate-float col-span-4 row-span-4 h-full w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/10" />
              <img src={photos[1]} alt="" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover shadow-xl ring-1 ring-white/10" />
              <img src={photos[2]} alt="" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover shadow-xl ring-1 ring-white/10" />
              <img src={photos[3]} alt="" className="col-span-3 row-span-2 h-full w-full rounded-3xl object-cover shadow-xl ring-1 ring-white/10" />
              <img src={photos[4] ?? photos[0]} alt="" className="col-span-1 row-span-2 h-full w-full rounded-3xl object-cover shadow-xl ring-1 ring-white/10" />
              <div className="animate-float absolute -bottom-4 left-4 rounded-2xl bg-white px-4 py-3 text-ink shadow-2xl" style={{ animationDelay: '1.5s' }}>
                <p className="text-2xl font-extrabold leading-none">{p?.stats.partners ?? '4,200+'}</p>
                <p className="text-xs text-slate-500">IT partners in the network</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section navigation */}
      <nav className="sticky top-16 z-20 border-b border-slate-200 bg-white/90 backdrop-blur" aria-label="On this page">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6">
          {sections.map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className="block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95">{label}</a></li>
          ))}
        </ul>
      </nav>

      {/* Impact */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {([
            [p?.stats.associations ?? associations.length, '', 'Member associations', 'FITAG'],
            [4200, '+', 'IT partners', 'across Gujarat'],
            [associations.length, '', 'Associations on CAN', `${zones.length} zones`],
            [members, '', 'Businesses listed', 'and growing'],
            [community.stats.cities, '', 'Cities', 'from Kutch to Vapi'],
          ] as [number, string, string, string][]).map(([v, suffix, label, sub], i) => (
            <Reveal key={label} delay={i * 80} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <dd className="text-3xl font-extrabold tracking-tight text-ink"><CountUp value={v} suffix={suffix} /></dd>
              <dt className="mt-1 text-sm font-medium text-slate-700">{label}</dt>
              <p className="text-xs text-slate-500">{sub}</p>
            </Reveal>
          ))}
        </dl>
        {p && <p className="mt-3 text-center text-sm text-slate-500">FITAG partners contribute more than <b className="text-slate-700">{p.stats.annualBusiness}</b> of IT hardware business every year.</p>}
      </section>

      {/* Story */}
      <section id="story" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Our story</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">From one federation to one network</h2>
            <div className="mt-4 space-y-4 text-slate-700">
              <p>{p?.name ?? 'FITAG'} is the umbrella body of the IT trade in Gujarat — the first regional federation of its kind in India. Every city has its own association, and most of their challenges are common: competition, large-format retailers, fraud, changing tax rules.</p>
              <p>FITAG brings those associations onto one platform to share knowledge, represent the fraternity to government and industry, and protect members&apos; interests. <b>CAN carries that unity online</b>: one place where customers find member stores, and one system every member can run their business on.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {([
              ['store', 'For member businesses', 'Own branded website and domain, GST billing and POS, serial-level inventory, repair job cards, bookings and reports.'],
              ['users', 'For customers', 'Find verified stores and service centres near you, book repairs online and track them live.'],
              ['layers', 'For associations', 'Member directory, office bearers, events and one voice for the city — all kept up to date.'],
            ] as [IconName, string, string][]).map(([icon, t, d], i) => (
              <Reveal key={t} delay={i * 100} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon name={icon} className="h-6 w-6" /></span>
                <span><span className="block font-semibold text-slate-900">{t}</span><span className="mt-1 block text-sm text-slate-600">{d}</span></span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Agenda */}
      {p && (
        <section id="agenda" className="mt-16 scroll-mt-32 bg-ink py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-widest text-can-amber">Foundation</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">FITAG&apos;s Five Point Agenda</h2>
              <p className="mt-2 max-w-2xl text-stone-400">Flourish, Knowledge, Networking, Strength and Protection — the five points on which the federation is built.</p>
            </Reveal>
            <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {p.agenda.map((a, i) => (
                <Reveal as="li" key={a.title} delay={i * 90} className="group relative overflow-hidden rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
                  <span className="absolute -right-3 -top-6 text-8xl font-black text-white/5 transition group-hover:text-white/10">{i + 1}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: AGENDA_COLORS[i] }}><Icon name={AGENDA_ICONS[i]} /></span>
                  <p className="mt-4 text-lg font-bold">{a.title}</p>
                  <p className="mt-1 text-sm text-stone-400">{a.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Timeline */}
      {past.length > 0 && (
        <section id="timeline" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16 sm:px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Timeline</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Presidents who built the federation</h2>
          </Reveal>
          <ol className="relative mt-10 grid grid-cols-1 gap-8 before:absolute before:bottom-0 before:left-[27px] before:top-0 before:w-0.5 before:bg-gradient-to-b before:from-can-red before:via-can-orange before:to-can-amber sm:grid-cols-2 sm:before:hidden lg:grid-cols-4">
            {[...past.map((t) => ({ key: t.name, year: t.years!, title: t.name, sub: 'President', photo: t.photo, now: false })),
              { key: 'can', year: '2026', title: 'CAN launches', sub: 'One digital network for every association', photo: null, now: true }].map((x, i) => (
              <Reveal as="li" key={x.key} delay={(i % 4) * 90} className="relative flex items-center gap-4 sm:flex-col sm:items-start">
                {x.now ? (
                  <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink ring-4 ring-surface"><CanMark className="h-5 w-auto" title="" /></span>
                ) : (
                  <span className="relative z-10 rounded-full ring-4 ring-surface"><Avatar src={x.photo} name={x.title} className="h-14 w-14" /></span>
                )}
                <div>
                  <p className="text-sm font-extrabold text-can-orange">{x.year}</p>
                  <p className="font-semibold text-slate-900">{x.title}</p>
                  <p className="text-xs text-slate-500">{x.sub}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {/* Network */}
      <section id="network" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-can-orange">The network</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{zones.length} zones, {associations.length} associations</h2>
          </Reveal>
          <Link href="/associations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">Browse all associations <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z, i) => (
            <Reveal key={z.zone} delay={(i % 3) * 90} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-slate-900">{z.zone}</h3>
                <span className="text-xs text-slate-500">{z.list.reduce((n, a) => n + a.memberCount, 0)} members</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {z.list.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/associations/${a.slug}`} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-xs font-medium text-slate-700 transition hover:border-brand-100 hover:bg-brand-50 active:scale-95" title={a.name}>
                      <span className="scale-[.72] -m-1.5"><AssociationBadge code={a.code} slug={a.slug} /></span>
                      {a.city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Leadership */}
      <section id="leadership" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-widest text-can-orange">Leadership</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">FITAG core committee</h2>
        </Reveal>
        <div className="mt-6"><CoreCommittee team={core} /></div>
        {others.length > 0 && (
          <>
            <h3 className="mt-12 text-lg font-bold text-ink">Advisory committee</h3>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((t) => (
                <li key={t.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <Avatar src={t.photo} name={t.name} className="h-10 w-10" />
                  <span className="min-w-0 text-sm"><span className="block truncate font-medium text-slate-900">{t.name}</span>{t.city && <span className="text-xs text-slate-500">{t.city}</span>}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link href="/#people" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand">City presidents &amp; secretaries <Icon name="arrowRight" className="h-4 w-4" /></Link>
      </section>

      {/* Banner + objectives */}
      {p && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <Reveal><img src="/brand/fitag-setu-banner.jpg" alt="FITAG Setu — Let's expand our horizon. Flourish, Knowledge, Networking, Strength, Protection." className="w-full rounded-3xl border border-slate-200 shadow-card" /></Reveal>
            <Reveal delay={100}>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">What the federation stands for</h2>
              <ul className="mt-4 space-y-3">
                {(p.objectives ?? []).map((o) => (
                  <li key={o} className="flex gap-3 text-slate-700"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon name="check" className="h-4 w-4" /></span>{o}</li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-semibold italic text-brand-700">&ldquo;{p.motto}&rdquo;</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-ink p-7 text-white lg:col-span-1">
            <h2 className="text-2xl font-extrabold">Run a computer or IT business in Gujarat?</h2>
            <p className="mt-2 text-stone-300">Join CAN through your city association and get your own website, billing, inventory and repair management.</p>
            <Link href="/join" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold active:scale-[.97]">Become a member <Icon name="arrowRight" className="h-4 w-4" /></Link>
          </div>
          {p && (
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
              <h2 className="text-lg font-bold text-ink">Contact FITAG</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {p.contacts.map((c) => (
                  <li key={c.email} className="flex items-center justify-between gap-4"><span className="text-slate-500">{c.label}</span><a className="font-medium text-brand" href={`mailto:${c.email}`}>{c.email}</a></li>
                ))}
              </ul>
              <a className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand" href={`${p.url}/contact-us/`} target="_blank" rel="noreferrer">fitag.in/contact-us <Icon name="arrowRight" className="h-4 w-4" /></a>
            </div>
          )}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="text-lg font-bold text-ink">Useful links</h2>
            <div className="mt-3 space-y-4">
              {network.usefulLinks?.map((g) => (
                <details key={g.group} className="group" open={g.group.startsWith('Gov')}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">{g.group}<span className="text-slate-400 transition group-open:rotate-180">▾</span></summary>
                  <ul className="mt-2 space-y-1.5 text-sm">{g.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{l.label}</a></li>)}</ul>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
