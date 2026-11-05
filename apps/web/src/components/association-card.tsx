import Link from 'next/link';
import type { Association } from '@/lib/types';
import { Icon } from './icons';

const CODE_COLORS = ['#C1272D', '#F15A29', '#F7941D'];

/** Code badge in the CAN palette — colour is stable per association. */
export function AssociationBadge({ code, slug, size = 'md' }: { code: string | null; slug: string; size?: 'md' | 'lg' }) {
  const color = CODE_COLORS[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 3];
  const label = (code ?? slug.slice(0, 3)).toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl font-extrabold tracking-tight text-white ${size === 'lg' ? 'h-16 w-16 text-base' : 'h-11 w-11 text-[11px]'}`} style={{ background: color }} aria-hidden="true">
      {label.slice(0, 5)}
    </span>
  );
}

export function AssociationCard({ a }: { a: Association }) {
  const president = a.officeBearers.find((b) => b.post === 'President');
  return (
    <Link href={`/associations/${a.slug}`} className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-lg">
      <AssociationBadge code={a.code} slug={a.slug} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand">{a.name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Icon name="pin" className="h-3.5 w-3.5" />{a.city.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-semibold text-brand-700">{a.memberCount} members</span>
          {president && <span className="truncate text-slate-500">President: {president.name}</span>}
        </div>
      </div>
    </Link>
  );
}
