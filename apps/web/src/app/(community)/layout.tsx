import type { ReactNode } from 'react';
import { CommunityFooter, CommunityNav } from '@/components/site-chrome';

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CommunityNav />
      <main className="page-in">{children}</main>
      <CommunityFooter />
    </>
  );
}
