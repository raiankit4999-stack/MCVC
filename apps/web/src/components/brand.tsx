import Link from 'next/link';

/** CAN brand colours (from the logo). */
export const CAN = { red: '#C1272D', orange: '#F15A29', amber: '#F7941D' };

/** The "can" letter mark: crimson c, orange-red a, amber n. */
export function CanMark({ className = 'h-9 w-auto', title = 'CAN' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 392 210" className={className} role="img" aria-label={title}>
      <defs>
        <clipPath id="can-c"><rect x="0" y="0" width="97" height="210" /></clipPath>
        <clipPath id="can-a"><rect x="103" y="0" width="110" height="210" /></clipPath>
      </defs>
      <path clipPath="url(#can-c)" fill={CAN.red} fillRule="evenodd" d="M0,105a100,100 0 1,0 200,0a100,100 0 1,0 -200,0ZM50,105a50,50 0 1,0 100,0a50,50 0 1,0 -100,0Z" />
      <g clipPath="url(#can-a)" fill={CAN.orange}>
        <path fillRule="evenodd" d="M0,105a100,100 0 1,0 200,0a100,100 0 1,0 -200,0ZM50,105a50,50 0 1,0 100,0a50,50 0 1,0 -100,0Z" />
        <rect x="150" y="105" width="50" height="100" />
      </g>
      <path fill={CAN.amber} fillRule="evenodd" d="M214,205V105A85,85 0 0 1 384,105V205ZM264,205V105A35,35 0 0 1 334,105V205Z" />
    </svg>
  );
}

/** Full lockup: mark | computer / association / network. */
export function CanLogo({ dark = false, compact = false, href = '/' }: { dark?: boolean; compact?: boolean; href?: string }) {
  const ink = dark ? 'text-stone-200' : 'text-stone-600';
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="CAN — Computer Association Network, home">
      <CanMark className={compact ? 'h-7 w-auto' : 'h-9 w-auto'} />
      <span className={`h-9 w-px ${dark ? 'bg-stone-600' : 'bg-stone-300'}`} aria-hidden="true" />
      <span className={`text-[11px] font-medium leading-[1.15] ${ink}`}>
        <span className="block"><b style={{ color: CAN.red }}>c</b>omputer</span>
        <span className="block"><b style={{ color: CAN.orange }}>a</b>ssociation</span>
        <span className="block"><b style={{ color: CAN.amber }}>n</b>etwork</span>
      </span>
    </Link>
  );
}
