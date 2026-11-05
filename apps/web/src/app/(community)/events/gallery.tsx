'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reveal } from '@/components/motion';
import { cx } from '@/components/ui';

export interface Photo { src: string; caption?: string }

/** Full-screen photo viewer: arrows, swipe, Esc; locks page scroll while open. */
export function Lightbox({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => index !== null && onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  useEffect(() => {
    if (index === null) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [index, go, onClose]);
  if (index === null || typeof document === 'undefined') return null;
  const p = photos[index];
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-white/70">{index + 1} / {photos.length}</span>
        <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 active:scale-95">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        <img key={p.src} src={p.src} alt={p.caption ?? 'Event photo'} className="page-in max-h-full max-w-full rounded-lg object-contain" />
        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid">‹</button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid">›</button>
          </>
        )}
      </div>
      <p className="pb-safe min-h-[56px] px-4 py-4 text-center text-sm text-white/80">{p.caption}</p>
    </div>,
    document.body,
  );
}

/** Programme cards with a year filter; any photo opens the lightbox. */
export function Programmes({ items }: { items: { title: string; date: string | null; year: string | null; images: string[] }[] }) {
  const years = useMemo(() => [...new Set(items.map((i) => i.year).filter(Boolean) as string[])].sort().reverse(), [items]);
  const [year, setYear] = useState<string>('all');
  const [open, setOpen] = useState<{ photos: Photo[]; i: number } | null>(null);
  const shown = items.filter((i) => year === 'all' || i.year === year);
  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by year">
        {['all', ...years].map((y) => (
          <button key={y} role="tab" aria-selected={year === y} onClick={() => setYear(y)} className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition active:scale-95', year === y ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            {y === 'all' ? `All (${items.length})` : y}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g, gi) => {
          const photos = g.images.map((src) => ({ src, caption: g.title + (g.date ? ` · ${g.date}` : '') }));
          return (
            <Reveal key={g.title + gi} delay={(gi % 3) * 80} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <button onClick={() => setOpen({ photos, i: 0 })} className="relative block w-full overflow-hidden" aria-label={`Open photos: ${g.title}`}>
                <img src={g.images[0]} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" />
                {g.images.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">+{g.images.length - 1} photos</span>}
              </button>
              {g.images.length > 1 && (
                <div className="grid grid-cols-2 gap-0.5">
                  {g.images.slice(1, 3).map((src, i) => (
                    <button key={src} onClick={() => setOpen({ photos, i: i + 1 })} className="overflow-hidden" aria-label="Open photo"><img src={src} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover transition hover:opacity-90" /></button>
                  ))}
                </div>
              )}
              <div className="p-4">
                {g.date && <p className="text-xs font-bold uppercase tracking-wider text-can-orange">{g.date}</p>}
                <h3 className="mt-1 font-semibold leading-snug text-slate-900">{g.title}</h3>
              </div>
            </Reveal>
          );
        })}
      </div>
      <Lightbox photos={open?.photos ?? []} index={open ? open.i : null} onClose={() => setOpen(null)} onIndex={(i) => setOpen((o) => (o ? { ...o, i } : o))} />
    </>
  );
}

/** Masonry photo wall; every photo opens the lightbox. */
export function PhotoMasonry({ photos }: { photos: Photo[] }) {
  const [i, setI] = useState<number | null>(null);
  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {photos.map((p, n) => (
          <button key={p.src} onClick={() => setI(n)} className="group block w-full break-inside-avoid overflow-hidden rounded-2xl" aria-label="Open photo">
            <img src={p.src} alt="" loading="lazy" className="w-full transition duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>
      <Lightbox photos={photos} index={i} onClose={() => setI(null)} onIndex={setI} />
    </>
  );
}

/** Featured event mosaic (first photo large) with lightbox. */
export function FeaturedMosaic({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState<number | null>(null);
  const ph = photos.map((src) => ({ src, caption: title }));
  return (
    <>
      <div className="grid h-[320px] grid-cols-4 grid-rows-2 gap-2 sm:h-[420px]">
        {photos.slice(0, 5).map((src, n) => (
          <button key={src} onClick={() => setI(n)} className={cx('group overflow-hidden rounded-2xl', n === 0 ? 'col-span-4 row-span-1 sm:col-span-2 sm:row-span-2' : 'col-span-2 hidden sm:col-span-1 sm:block', n === 1 ? 'block' : '', n === 2 ? 'block' : '')} aria-label="Open photo">
            <img src={src} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>
      <Lightbox photos={ph} index={i} onClose={() => setI(null)} onIndex={setI} />
    </>
  );
}
