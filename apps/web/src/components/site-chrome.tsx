import Link from 'next/link';
import { CanLogo } from './brand';

/** Community logo lockup (CAN — Computer Association Network). */
export function Logo({ dark = false }: { dark?: boolean }) {
  return <CanLogo dark={dark} />;
}

export function CommunityNav() {
  const links = [
    ['Associations', '/associations'],
    ['Stores', '/stores'],
    ['Events', '/events'],
    ['Service centres', '/service-centres'],
    ['About', '/about'],
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
    <footer className="mt-20 bg-ink-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <a href="https://fitag.in" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white px-4 py-2.5" aria-label="FITAG — parent body (opens fitag.in)">
            <img src="/brand/fitag-logo.png" alt="FITAG — Federation of IT Associations of Gujarat" className="h-6 w-auto" />
          </a>
          <p className="mt-4 max-w-sm text-sm text-slate-400">
            An initiative of the IT associations of Gujarat under FITAG — the parent body of 43 member associations and 4,200+ IT partners.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Discover</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/stores" className="hover:text-white">All stores</Link></li>
            <li><Link href="/associations" className="hover:text-white">Associations</Link></li>
            <li><Link href="/events" className="hover:text-white">Events &amp; gallery</Link></li>
            <li><Link href="/service-centres" className="hover:text-white">Service centres</Link></li>
            <li><Link href="/stores?verified=true" className="hover:text-white">Verified members</Link></li>
            <li><Link href="/about" className="hover:text-white">About CAN &amp; FITAG</Link></li>
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
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} CAN — Computer Association Network. Store data belongs to each independent store.</div>
    </footer>
  );
}
