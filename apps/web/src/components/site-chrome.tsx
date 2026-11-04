import Link from 'next/link';
import { Icon } from './icons';

export function Logo({ dark = false, name = 'PC Community', sub = 'Computer Stores & IT Services Network' }: { dark?: boolean; name?: string; sub?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
        <Icon name="desktop" />
      </span>
      <span className="leading-tight">
        <span className={`block text-[15px] font-bold ${dark ? 'text-white' : 'text-navy'}`}>{name}</span>
        <span className={`block text-[10px] ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</span>
      </span>
    </Link>
  );
}

export function CommunityNav() {
  const links = [
    ['Home', '/'],
    ['Stores', '/stores'],
    ['Repair & Services', '/stores?category=laptop-repair'],
    ['Cities', '/#cities'],
    ['Become a Member', '/join'],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {links.map(([l, h]) => (
            <Link key={h} href={h} className="hover:text-brand">
              {l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex">
            Sign in
          </Link>
          <Link href="/join" className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-700">
            Join Community
          </Link>
        </div>
      </div>
    </header>
  );
}

export function CommunityFooter() {
  return (
    <footer className="mt-20 bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm text-slate-400">
            One network. Independent businesses. A verified community of computer retailers, laptop stores, repair centres and IT service providers.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Discover</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/stores" className="hover:text-white">All stores</Link></li>
            <li><Link href="/stores?category=laptop-repair" className="hover:text-white">Laptop repair</Link></li>
            <li><Link href="/stores?verified=true" className="hover:text-white">Verified members</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">For businesses</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/join" className="hover:text-white">Become a member</Link></li>
            <li><Link href="/login" className="hover:text-white">Store login</Link></li>
            <li><span>Privacy · Terms</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} PC Community. Store data belongs to each independent store.</div>
    </footer>
  );
}
