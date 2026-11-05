'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './ui';

/** Slide-in menu for phones. Closes on route change and Escape; locks page scroll while open. */
export function MobileMenu({ links, footer, accent = 'bg-brand', label = 'Menu' }: { links: [string, string][]; footer?: ReactNode; accent?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} aria-expanded={open} className="-mr-2 grid h-11 w-11 place-items-center rounded-xl text-slate-700 active:bg-slate-100 md:hidden">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {mounted && createPortal(
      <div className={cx('fixed inset-0 z-50 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <div className={cx('absolute inset-0 bg-black/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <nav className={cx('pb-safe absolute inset-y-0 right-0 flex w-[84%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out', open ? 'translate-x-0' : 'translate-x-full')} aria-label="Mobile">
          <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="-mr-2 grid h-11 w-11 place-items-center rounded-xl text-slate-600 active:bg-slate-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 py-3">
            {links.map(([l, h], i) => {
              const active = h === path || (h !== '/' && !h.includes('#') && path.startsWith(h));
              return (
                <li key={h} style={{ transitionDelay: open ? `${60 + i * 35}ms` : '0ms' }} className={cx('transition duration-300', open ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0')}>
                  <Link href={h} onClick={() => setOpen(false)} className={cx('flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium active:bg-slate-100', active ? 'bg-brand-50 text-brand-700' : 'text-slate-800')}>
                    {l}<svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                </li>
              );
            })}
          </ul>
          {footer && <div className="border-t border-slate-100 p-4">{footer}</div>}
          <span className={cx('h-1', accent)} />
        </nav>
      </div>, document.body)}
    </>
  );
}
