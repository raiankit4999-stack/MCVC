import Link from 'next/link';
import { CanMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { api } from '@/lib/server-api';
import type { CommunityProfile } from '@/lib/types';

export const metadata = { title: 'About CAN & FITAG' };
export const dynamic = 'force-dynamic';

export default async function About() {
  const community = await api<CommunityProfile>('/community');
  const p = community.settings.parent;
  return (
    <>
      <section className="hero-bg px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <CanMark className="h-12 w-auto" />
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Computer Association Network</h1>
          <p className="mt-3 max-w-2xl text-lg text-stone-300">
            One network for Gujarat&apos;s computer traders, laptop stores, repair centres and IT service providers. Every member business gets its own website, ERP and CRM — and customers find trusted local stores in one place.
          </p>
        </div>
      </section>

      {p && (
        <div className="mx-auto max-w-5xl space-y-16 px-4 py-14 sm:px-6">
          <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="text-2xl font-bold text-ink">Our parent body: {p.shortName}</h2>
              <p className="mt-3 text-slate-700">
                {p.name} is the umbrella body of all IT associations of Gujarat. {p.stats.associations} IT associations are registered members, representing {p.stats.partners} partners in the IT business who together contribute more than {p.stats.annualBusiness} of IT hardware business every year.
              </p>
              <p className="mt-3 text-slate-700">
                Cities across Gujarat each have their own association, and most of their problems are common. FITAG brings them onto one platform to support events, share knowledge, represent the fraternity to state and national bodies, and protect members&apos; common interests. CAN extends that to the digital storefront and the daily running of each member business.
              </p>
              <a href={p.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">Visit fitag.in <Icon name="arrowRight" className="h-4 w-4" /></a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <img src="/brand/fitag-logo.png" alt="FITAG — Federation of IT Associations of Gujarat" className="h-7 w-auto" />
              <p className="mt-3 text-sm font-semibold italic text-brand-700">&ldquo;{p.motto}&rdquo;</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Member associations</dt><dd className="font-semibold">{p.stats.associations}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">IT partners</dt><dd className="font-semibold">{p.stats.partners}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Annual IT hardware business</dt><dd className="font-semibold">{p.stats.annualBusiness}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Cities on CAN</dt><dd className="font-semibold">{community.stats.cities}</dd></div>
              </dl>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">FITAG&apos;s Five Point Agenda</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {p.agenda.map((a, i) => (
                <li key={a.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                  <p className="mt-3 font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{a.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <img src="/brand/fitag-setu-banner.jpg" alt="FITAG Setu — Let's expand our horizon. Flourish, Knowledge, Networking, Strength, Protection." className="w-full rounded-3xl border border-slate-200" />

          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-ink">FITAG active committee</h2>
              <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {p.committee.map((m) => (
                  <li key={m.name + m.role} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{m.name.replace(/^Mr\.\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                    <span><span className="block font-medium text-slate-900">{m.name}</span><span className="text-sm text-slate-500">{m.role}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink">Contact</h2>
              <ul className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
                {p.contacts.map((c) => (
                  <li key={c.email} className="flex justify-between gap-4"><span className="text-slate-500">{c.label}</span><a className="font-medium text-brand" href={`mailto:${c.email}`}>{c.email}</a></li>
                ))}
                <li className="pt-2 text-slate-500">For your city association, see <a className="font-medium text-brand" href={`${p.url}/contact-us/`} target="_blank" rel="noreferrer">fitag.in/contact-us</a>.</li>
              </ul>
              <div className="mt-6 rounded-2xl bg-ink p-6 text-white">
                <p className="font-semibold">Run a computer or IT business in Gujarat?</p>
                <p className="mt-1 text-sm text-stone-300">Join CAN through your city association and get your own website, billing, inventory and repair management.</p>
                <Link href="/join" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold">Become a member</Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
