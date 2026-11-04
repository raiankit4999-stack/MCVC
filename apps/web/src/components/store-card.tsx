import Link from 'next/link';
import type { StoreCard as S } from '@/lib/types';
import { Icon } from './icons';
import { Badge } from './ui';

export function storeUrl(s: Pick<S, 'slug' | 'primaryDomain'>) {
  if (s.primaryDomain) return `https://${s.primaryDomain}`;
  return `http://${s.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'mcvc.localhost'}:3000`;
}

export function StoreCard({ store }: { store: S }) {
  return (
    <Link href={`/stores/${store.slug}`} className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: store.primaryColor }}>
          {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : store.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand">{store.name}</h3>
            {store.isVerified && <Icon name="shield" className="h-4 w-4 shrink-0 text-brand" aria-label="Verified member" />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Icon name="pin" className="h-3.5 w-3.5" /> {store.area.name}, {store.city.name}
          </p>
        </div>
      </div>
      {store.tagline && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{store.tagline}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {store.categories.slice(0, 3).map((c) => (
          <Badge key={c.slug} tone={c.kind === 'SERVICE' ? 'violet' : 'blue'}>{c.name}</Badge>
        ))}
        {store.categories.length > 3 && <Badge>+{store.categories.length - 3}</Badge>}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4 text-xs">
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <Icon name="star" className="h-4 w-4 fill-amber-400 text-amber-400" /> {store.rating.toFixed(1)} <span className="text-slate-400">({store.ratingCount})</span>
        </span>
        {store.isOpen !== null && <span className={store.isOpen ? 'font-medium text-success' : 'text-slate-400'}>{store.isOpen ? 'Open now' : 'Closed'}</span>}
      </div>
    </Link>
  );
}
