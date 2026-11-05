import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { MobileMenu } from '@/components/mobile-menu';
import { FONTS, basePath, getStore, hostFrom } from './data';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Groups consecutive days with identical hours: "Mon–Sat 10:00–20:00". */
function compactHours(hours: { day: number; open: string; close: string }[]) {
  const sorted = [...hours].sort((a, b) => a.day - b.day);
  const groups: { from: number; to: number; open: string; close: string }[] = [];
  for (const h of sorted) {
    const g = groups[groups.length - 1];
    if (g && g.to === h.day - 1 && g.open === h.open && g.close === h.close) g.to = h.day;
    else groups.push({ from: h.day, to: h.day, open: h.open, close: h.close });
  }
  return groups.map((g) => `${DAYS[g.from]}${g.to !== g.from ? `–${DAYS[g.to]}` : ''} ${g.open}–${g.close}`).join(', ');
}

export async function generateMetadata({ params }: { params: Promise<{ host: string }> }) {
  const s = await getStore(hostFrom((await params).host));
  return { title: { default: s.branding.seoTitle ?? `${s.name} — ${s.area}, ${s.city}`, template: `%s · ${s.name}` }, description: s.branding.seoDescription ?? s.branding.tagline ?? undefined, icons: s.branding.logoUrl ? [{ url: s.branding.logoUrl }] : undefined };
}

export default async function StoreSiteLayout({ children, params }: { children: ReactNode; params: Promise<{ host: string }> }) {
  const host = hostFrom((await params).host);
  const s = await getStore(host);
  const base = await basePath(host);
  const b = s.branding;
  const hoursLine = compactHours(b.businessHours);
  return (
    <div style={{ ['--brand' as string]: b.primaryColor, ['--accent' as string]: b.accentColor, fontFamily: FONTS[b.fontPreset] ?? FONTS.inter }} className="min-h-screen bg-white">
      <div className="hidden bg-slate-50 text-xs text-slate-600 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-end gap-6 px-6">
          <span className="flex items-center gap-1.5"><Icon name="pin" className="h-3.5 w-3.5" />{s.area}, {s.city}</span>
          <a href={`tel:${s.phone}`} className="flex items-center gap-1.5"><Icon name="phone" className="h-3.5 w-3.5" />{s.phone}</a>
          {hoursLine && <span className="flex items-center gap-1.5"><Icon name="clock" className="h-3.5 w-3.5" />{hoursLine}</span>}
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={`${base}/`} className="flex min-w-0 items-center gap-2.5">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ background: 'var(--brand)' }}><Icon name="desktop" /></span>}
            <span className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--accent)' }}>{s.name}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <Link href={`${base}/`} className="hover:text-[var(--brand)]">Home</Link>
            <Link href={`${base}/products`} className="hover:text-[var(--brand)]">Products</Link>
            <Link href={`${base}/services`} className="hover:text-[var(--brand)]">Services &amp; Repair</Link>
            <Link href={`${base}/#about`} className="hover:text-[var(--brand)]">About</Link>
            <Link href={`${base}/#contact`} className="hover:text-[var(--brand)]">Contact</Link>
          </nav>
          <div className="flex items-center gap-1">
            <Link href={`${base}/book`} className="hidden h-10 items-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:scale-[.97] sm:inline-flex" style={{ background: 'var(--brand)' }}>Book a Service</Link>
            <MobileMenu label={s.name} links={[['Home', `${base}/`], ['Products', `${base}/products`], ['Services & Repair', `${base}/services`], ['Book a service', `${base}/book`], ['About', `${base}/#about`], ['Contact', `${base}/#contact`]]} />
          </div>
        </div>
      </header>
      <main className="page-in pb-24 md:pb-0">{children}</main>
      {/* Sticky actions on phones */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2 p-2">
          <a href={`tel:${s.phone}`} className="flex h-12 flex-col items-center justify-center rounded-xl text-xs font-semibold text-slate-800 ring-1 ring-slate-200 active:bg-slate-50"><Icon name="phone" className="h-5 w-5" />Call</a>
          {b.whatsappNumber ? (
            <a href={`https://wa.me/${b.whatsappNumber.replace('+', '')}`} className="flex h-12 flex-col items-center justify-center rounded-xl bg-[#25D366] text-xs font-semibold text-white active:opacity-90"><Icon name="whatsapp" className="h-5 w-5" />WhatsApp</a>
          ) : (
            <Link href={`${base}/products`} className="flex h-12 flex-col items-center justify-center rounded-xl text-xs font-semibold text-slate-800 ring-1 ring-slate-200 active:bg-slate-50"><Icon name="box" className="h-5 w-5" />Products</Link>
          )}
          <Link href={`${base}/book`} className="flex h-12 flex-col items-center justify-center rounded-xl text-xs font-semibold text-white active:opacity-90" style={{ background: 'var(--brand)' }}><Icon name="calendar" className="h-5 w-5" />Book</Link>
        </div>
      </div>
      <footer id="contact" className="mt-20 text-slate-300" style={{ background: '#1C1917' }}>
        <div className="mx-auto grid grid-cols-1 max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-white">{s.name}</p>
            <p className="mt-2 text-sm text-slate-400">{b.footerText ?? b.tagline}</p>
            {s.gstin && <p className="mt-2 text-xs text-slate-500">GSTIN {s.gstin}</p>}
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><Icon name="pin" className="h-4 w-4 shrink-0" />{s.addressLine}</li>
            <li className="flex gap-2"><Icon name="phone" className="h-4 w-4 shrink-0" /><a href={`tel:${s.phone}`}>{s.phone}</a></li>
            <li className="flex gap-2"><Icon name="clock" className="h-4 w-4 shrink-0" />{compactHours(b.businessHours) || 'Call for hours'}</li>
          </ul>
          <div className="text-sm">
            {b.whatsappNumber && <a href={`https://wa.me/${b.whatsappNumber.replace('+', '')}`} className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 font-semibold text-white"><Icon name="whatsapp" className="h-4 w-4" /> Chat on WhatsApp</a>}
            <p className="mt-4 text-xs text-slate-500">A member of the Computer Association Network{s.isVerified && ' · Verified store'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
