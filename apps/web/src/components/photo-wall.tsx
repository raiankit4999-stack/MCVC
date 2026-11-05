/**
 * Animated wall of real community photos (three columns scrolling at different speeds).
 * Pure CSS animation; paused for prefers-reduced-motion.
 */
export function PhotoWall({ photos, className = '' }: { photos: string[]; className?: string }) {
  if (photos.length < 6) return null;
  const cols = [0, 1, 2].map((c) => photos.filter((_, i) => i % 3 === c));
  const anim = ['animate-marquee-y', 'animate-marquee-y-slow', 'animate-marquee-y'];
  return (
    <div className={`pause-on-hover relative grid h-[520px] grid-cols-3 gap-3 overflow-hidden rounded-3xl [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] ${className}`} aria-hidden="true">
      {cols.map((col, ci) => (
        <div key={ci} className={`flex flex-col gap-3 ${anim[ci]} ${ci === 1 ? 'pt-16' : ''}`}>
          {[...col, ...col].map((src, i) => (
            <img key={`${src}-${i}`} src={src} alt="" loading={i < 3 ? 'eager' : 'lazy'} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-lg ring-1 ring-white/10" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Horizontal ticker (duplicates its children so the loop is seamless). */
export function Ticker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`pause-on-hover overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}>
      <div className="animate-marquee-x flex w-max gap-3">{children}{children}</div>
    </div>
  );
}
