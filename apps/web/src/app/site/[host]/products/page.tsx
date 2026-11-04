import { api } from '@/lib/server-api';
import { ProductTile, PubProduct } from '../page';
import { basePath, hostFrom } from '../data';

export const metadata = { title: 'Products' };

export default async function Products({ params, searchParams }: { params: Promise<{ host: string }>; searchParams: Promise<{ q?: string }> }) {
  const host = hostFrom((await params).host);
  const { q } = await searchParams;
  const [base, data] = await Promise.all([basePath(host), api<{ total: number; items: PubProduct[] }>(`/public/store/products?pageSize=48${q ? `&q=${encodeURIComponent(q)}` : ''}`, { host })]);
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>Products</h1><p className="text-sm text-slate-500">{data.total} items</p></div>
        <form><input name="q" defaultValue={q} placeholder="Search laptops, SSDs…" className="h-10 w-64 rounded-lg border-0 px-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-[var(--brand)]" /></form>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{data.items.map((p) => <ProductTile key={p.id} p={p} base={base} />)}</div>
      {!data.items.length && <p className="mt-10 text-center text-slate-500">No products found.</p>}
    </div>
  );
}
