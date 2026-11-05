'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { CanMark } from './brand';
import { Icon, IconName } from './icons';
import { cx } from './ui';

export interface NavItem { label: string; href: string; icon: IconName }
export interface NavSection { title: string; items: NavItem[] }

export function Shell({ brand, brandSub, nav, user, children, topRight, mark, tabs = [] }: { brand: string; brandSub: string; nav: NavSection[]; user: { name: string; role: string }; children: ReactNode; topRight?: ReactNode; mark?: ReactNode; tabs?: NavItem[] }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);
  const active = (href: string) => (href.split('/').length <= 2 ? path === href : path.startsWith(href));
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST', body: {}, store: false }).catch(() => undefined);
    router.push('/login');
  }

  const sidebar = (
    <aside className="pb-safe flex h-full w-full flex-col bg-ink-950 text-slate-300 lg:w-64">
      <div className="flex items-center gap-2.5 px-5 py-5">
        {mark ?? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white">{brand.slice(0, 1)}</span>}
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
      <p className="flex items-center gap-2 px-6 pb-1 text-[10px] text-stone-500"><CanMark className="h-3 w-auto" title="CAN" /> Computer Association Network</p>
      <button onClick={logout} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 hover:text-white">
        <Icon name="logout" className="h-[18px] w-[18px]" /> Sign out
      </button>
    </aside>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      <div className={cx('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <button className={cx('absolute inset-0 bg-black/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
        <div className={cx('relative h-full w-72 max-w-[85%] transition-transform duration-300 ease-out', open ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</div>
      </div>
      <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button className="-ml-2 grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{greeting}, {user.name.split(' ')[0]}</p>
          <p className="truncate text-xs text-slate-500">{user.role}</p>
        </div>
        {topRight}
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white" title={user.name}>
          {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
        </span>
      </header>
      <main key={path} className={cx('page-in mx-auto max-w-[1400px] p-4 sm:p-6', tabs.length ? 'pb-28 lg:pb-6' : '')}>{children}</main>
      {tabs.length > 0 && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" aria-label="Quick navigation">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
            {tabs.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className={cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95', active(t.href) ? 'text-brand' : 'text-slate-500')} aria-current={active(t.href) ? 'page' : undefined}>
                  <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', active(t.href) ? 'bg-brand-50' : '')}><Icon name={t.icon} className="h-5 w-5" /></span>
                  {t.label}
                </Link>
              </li>
            ))}
            <li>
              <button onClick={() => setOpen(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500 active:scale-95">
                <span className="grid h-7 w-12 place-items-center rounded-full"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg></span>
                More
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
