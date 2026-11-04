'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { Icon, IconName } from './icons';
import { cx } from './ui';

export interface NavSection { title: string; items: { label: string; href: string; icon: IconName }[] }

export function Shell({ brand, brandSub, nav, user, children, topRight }: { brand: string; brandSub: string; nav: NavSection[]; user: { name: string; role: string }; children: ReactNode; topRight?: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href.split('/').length <= 2 ? path === href : path.startsWith(href));
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST', body: {}, store: false }).catch(() => undefined);
    router.push('/login');
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-navy-950 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Icon name="desktop" /></span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold text-white">{brand}</p>
          <p className="truncate text-[11px] text-slate-400">{brandSub}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Main">
        {nav.map((s) => (
          <div key={s.title}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.title}</p>
            <ul className="space-y-0.5">
              {s.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} className={cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', active(i.href) ? 'bg-brand text-white shadow' : 'hover:bg-white/5 hover:text-white')} aria-current={active(i.href) ? 'page' : undefined}>
                    <Icon name={i.icon} className="h-[18px] w-[18px]" />
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <button onClick={logout} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 hover:text-white">
        <Icon name="logout" className="h-[18px] w-[18px]" /> Sign out
      </button>
    </aside>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      )}
      <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{greeting}, {user.name.split(' ')[0]}</p>
          <p className="truncate text-xs text-slate-500">{user.role}</p>
        </div>
        {topRight}
        <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-semibold text-white" title={user.name}>
          {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
        </span>
      </header>
      <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
    </div>
  );
}
