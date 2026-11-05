import { notFound } from 'next/navigation';
import { Icon } from '@/components/icons';
import { label, money } from '@/lib/format';
import { apiOrNull } from '@/lib/server-api';
import { InquiryForm } from '../../inquiry-form';
import { hostFrom } from '../../data';

interface P { id: string; name: string; brand: string | null; modelNumber: string | null; description: string | null; imageUrl: string | null; mrp: string; sellingPrice: string; condition: string; specs: Record<string, string>; warrantyMonths: number; inStock: boolean; gstRate: string }

export default async function ProductPage({ params }: { params: Promise<{ host: string; id: string }> }) {
  const { host: raw, id } = await params;
  const host = hostFrom(raw);
  const p = await apiOrNull<P>(`/public/store/products/${id}`, { host });
  if (!p) notFound();
  const save = Number(p.mrp) - Number(p.sellingPrice);
  return (
    <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-6 py-10 lg:grid-cols-2">
      <div className="grid aspect-square place-items-center rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100">
        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="max-h-full rounded-3xl object-contain" /> : <Icon name="laptop" className="h-32 w-32 text-slate-300" />}
      </div>
      <div>
        {p.brand && <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>{p.brand}</p>}
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{p.name}</h1>
        <p className="mt-4 flex items-baseline gap-3"><span className="text-3xl font-bold">{money(p.sellingPrice, true)}</span>{save > 0 && <><span className="text-slate-400 line-through">{money(p.mrp, true)}</span><span className="rounded-md bg-red-50 px-2 py-0.5 text-sm font-semibold text-red-700">Save {money(save, true)}</span></>}</p>
        <p className="text-xs text-slate-500">+ GST {Number(p.gstRate)}% as applicable</p>
        <ul className="mt-6 space-y-2 text-sm">
          {Object.entries(p.specs).map(([k, v]) => <li key={k} className="flex gap-3"><span className="w-28 text-slate-500">{label(k)}</span><span className="font-medium">{v}</span></li>)}
          <li className="flex gap-3"><span className="w-28 text-slate-500">Condition</span><span className="font-medium">{label(p.condition)}</span></li>
          {p.warrantyMonths > 0 && <li className="flex gap-3"><span className="w-28 text-slate-500">Warranty</span><span className="font-medium">{p.warrantyMonths} months</span></li>}
        </ul>
        <p className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${p.inStock ? 'text-green-600' : 'text-slate-500'}`}><Icon name={p.inStock ? 'check' : 'clock'} className="h-4 w-4" />{p.inStock ? 'In stock — visit or reserve today' : 'Currently out of stock — ask us for availability'}</p>
        {p.description && <p className="mt-6 whitespace-pre-line text-slate-600">{p.description}</p>}
        <div className="mt-8 rounded-2xl border border-slate-200 p-5">
          <p className="font-semibold">Interested? We&apos;ll call you back</p>
          <InquiryForm host={host} productId={p.id} defaultMessage={`I'm interested in ${p.name}.`} />
        </div>
      </div>
    </div>
  );
}
