'use client';

import { useEffect, useState } from 'react';
import { BRAND_STATUS, BrandBadge } from '@/components/brand-badges';
import { useToast } from '@/components/toast';
import { Button, Card, cx } from '@/components/ui';
import { apiFetch, errorText } from '@/lib/client-api';
import type { BrandStatus } from '@/lib/types';

interface Data { brands: string[]; items: { brand: string; status: BrandStatus; verified: boolean }[] }
const OPTIONS: (BrandStatus | '')[] = ['', 'AUTHORISED', 'THIRD_PARTY', 'UNAUTHORISED'];

/** Owner declares which brands the store services and on what footing. */
export function BrandsCard() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [sel, setSel] = useState<Record<string, BrandStatus | ''>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void apiFetch<Data>('/store/brand-services').then((d) => { setData(d); setSel(Object.fromEntries(d.items.map((i) => [i.brand, i.status]))); });
  }, []);
  if (!data) return null;
  const verified = new Set(data.items.filter((i) => i.verified).map((i) => i.brand));
  const save = async () => {
    setSaving(true);
    try {
      const items = Object.entries(sel).filter(([, s]) => s).map(([brand, status]) => ({ brand, status }));
      const d = await apiFetch<Data>('/store/brand-services', { method: 'PUT', body: { items } });
      setData(d); toast('Brands saved — shown on your profile and in Service centres');
    } catch (e) { toast(errorText(e), 'error'); } finally { setSaving(false); }
  };
  const chosen = Object.entries(sel).filter(([, s]) => s) as [string, BrandStatus][];
  return (
    <Card title="Brands we service" action={<Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save brands'}</Button>}>
      <div className="space-y-4 p-4">
        <p className="text-xs text-slate-500">Choose each brand you repair and whether you are brand authorised, third-party authorised (via a distributor/service partner) or an independent (unauthorised) repairer. Changing a status removes its “verified” mark until the community team re-checks it.</p>
        {chosen.length > 0 && <div className="flex flex-wrap gap-1.5">{chosen.map(([brand, status]) => <BrandBadge key={brand} b={{ brand, status, verified: verified.has(brand) && data.items.find((i) => i.brand === brand)?.status === status }} />)}</div>}
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {data.brands.map((b) => (
            <li key={b} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="w-24 text-sm font-medium text-slate-800">{b}</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`${b} service status`}>
                {OPTIONS.map((o) => (
                  <button key={o || 'none'} type="button" role="radio" aria-checked={(sel[b] ?? '') === o} onClick={() => setSel({ ...sel, [b]: o })}
                    className={cx('rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition active:scale-95', (sel[b] ?? '') === o ? (o ? BRAND_STATUS[o].cls : 'bg-slate-800 text-white ring-slate-800') : 'text-slate-500 ring-slate-200 hover:bg-slate-50')}>
                    {o ? BRAND_STATUS[o].short : 'No'}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
