import type { BrandService, BrandStatus } from '@/lib/types';
import { cx } from './ui';

export const BRAND_STATUS: Record<BrandStatus, { label: string; short: string; help: string; cls: string; dot: string }> = {
  AUTHORISED: { label: 'Brand authorised', short: 'Authorised', help: 'Official authorised service centre of the brand', cls: 'bg-green-50 text-green-800 ring-green-200', dot: 'bg-green-600' },
  THIRD_PARTY: { label: 'Third-party authorised', short: 'Third-party', help: 'Authorised through a distributor or service partner of the brand', cls: 'bg-blue-50 text-blue-800 ring-blue-200', dot: 'bg-blue-600' },
  UNAUTHORISED: { label: 'Unauthorised', short: 'Unauthorised', help: 'Independent repair — not authorised by the brand', cls: 'bg-stone-100 text-stone-700 ring-stone-300 ring-dashed', dot: 'bg-stone-400' },
};

/** One brand chip: brand name + status, with a check when verified by the community. */
export function BrandBadge({ b, size = 'sm' }: { b: BrandService; size?: 'sm' | 'md' }) {
  const s = BRAND_STATUS[b.status];
  return (
    <span title={`${b.brand}: ${s.help}${b.verified ? ' · verified by CAN' : ' · declared by the store'}`} className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset', s.cls, size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]')}>
      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} aria-hidden="true" />
      <b className="font-semibold">{b.brand}</b>
      <span className="opacity-80">{s.short}</span>
      {b.verified && (
        <svg viewBox="0 0 24 24" className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} fill="currentColor" aria-label="verified by CAN"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.2 15.8l.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2zM10.6 15.6l6-6-1.4-1.4-4.6 4.6-2-2-1.4 1.4z" /></svg>
      )}
    </span>
  );
}

export function BrandBadges({ items, max, size = 'sm', className }: { items: BrandService[]; max?: number; size?: 'sm' | 'md'; className?: string }) {
  if (!items?.length) return null;
  const shown = max ? items.slice(0, max) : items;
  return (
    <div className={cx('flex flex-wrap gap-1.5', className)} aria-label="Brands serviced">
      {shown.map((b) => <BrandBadge key={b.brand} b={b} size={size} />)}
      {max && items.length > max && <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">+{items.length - max} brands</span>}
    </div>
  );
}

export function BrandLegend({ className }: { className?: string }) {
  return (
    <ul className={cx('grid grid-cols-1 gap-2 text-sm sm:grid-cols-3', className)}>
      {(Object.keys(BRAND_STATUS) as BrandStatus[]).map((k) => (
        <li key={k} className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <BrandBadge b={{ brand: 'Brand', status: k, verified: false }} />
          <span className="text-xs text-slate-600">{BRAND_STATUS[k].help}</span>
        </li>
      ))}
      <li className="text-xs text-slate-500 sm:col-span-3">
        Status is declared by each store. <span className="font-medium text-slate-700">✓ Verified</span> means the community team has checked the store&apos;s authorisation.
      </li>
    </ul>
  );
}
