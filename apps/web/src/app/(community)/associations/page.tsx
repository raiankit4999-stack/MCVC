import Link from 'next/link';
import { AssociationCard } from '@/components/association-card';
import { api } from '@/lib/server-api';
import { ZONE_ORDER, type Association } from '@/lib/types';

export const metadata = { title: 'Member associations' };
export const dynamic = 'force-dynamic';

export default async function Associations({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const { zone } = await searchParams;
  const all = await api<Association[]>('/associations');
  const zones = ZONE_ORDER.filter((z) => all.some((a) => a.zone === z));
  const shown = zones.filter((z) => !zone || z === zone);
  const members = all.reduce((n, a) => n + a.memberCount, 0);
  return (
    <>
      <section className="hero-bg px-4 pb-12 pt-12 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Member associations</h1>
          <p className="mt-2 max-w-2xl text-stone-300">{all.length} IT trade associations across Gujarat, with {members.toLocaleString('en-IN')} member businesses listed on CAN.</p>
          <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter by zone">
            <Link href="/associations" className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ${!zone ? 'bg-white text-ink ring-white' : 'ring-white/30 hover:bg-white/10'}`}>All zones</Link>
            {zones.map((z) => (
              <Link key={z} href={`/associations?zone=${encodeURIComponent(z)}`} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ${zone === z ? 'bg-white text-ink ring-white' : 'ring-white/30 hover:bg-white/10'}`}>{z}</Link>
            ))}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
        {shown.map((z) => {
          const list = all.filter((a) => a.zone === z);
          return (
            <section key={z}>
              <h2 className="flex items-baseline gap-3 text-xl font-bold text-ink">{z}<span className="text-sm font-normal text-slate-500">{list.length} associations · {list.reduce((n, a) => n + a.memberCount, 0)} members</span></h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((a) => <AssociationCard key={a.slug} a={a} />)}</div>
            </section>
          );
        })}
      </div>
    </>
  );
}
