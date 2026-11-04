import Link from 'next/link';
import { Icon } from '@/components/icons';
import { money } from '@/lib/format';
import { api } from '@/lib/server-api';
import type { PubService } from '../page';
import { basePath, hostFrom } from '../data';

export const metadata = { title: 'Repair & IT services' };

export default async function Services({ params }: { params: Promise<{ host: string }> }) {
  const host = hostFrom((await params).host);
  const [base, services] = await Promise.all([basePath(host), api<PubService[]>('/public/store/services', { host })]);
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>Repair &amp; IT services</h1>
      <p className="mt-2 text-slate-600">Laptop, desktop and IT support by certified technicians. Book a slot online — we&apos;ll confirm on WhatsApp.</p>
      <div className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {services.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand) 12%, white)', color: 'var(--brand)' }}><Icon name="wrench" /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{v.name}</p><p className="text-sm text-slate-500">{v.description}</p></div>
            <p className="font-semibold">{v.priceIsStarting ? 'From ' : ''}{money(v.price, true)}</p>
            {v.isBookable ? <Link href={`${base}/book?service=${v.id}`} className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white" style={{ background: 'var(--brand)' }}>Book</Link> : <Link href={`${base}/#contact`} className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Enquire</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
