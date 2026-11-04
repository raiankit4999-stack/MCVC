'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { NavSection, Shell } from '@/components/shell';
import { Skeleton } from '@/components/ui';
import { apiFetch } from '@/lib/client-api';
import { label } from '@/lib/format';

const NAV: NavSection[] = [
  { title: 'Network', items: [{ label: 'Overview', href: '/admin', icon: 'home' }, { label: 'Store applications', href: '/admin/applications', icon: 'file' }, { label: 'Stores', href: '/admin/stores', icon: 'store' }] },
  { title: 'Configuration', items: [{ label: 'Cities & areas', href: '/admin/cities', icon: 'map' }, { label: 'Membership plans', href: '/admin/plans', icon: 'tag' }] },
  { title: 'Governance', items: [{ label: 'Audit log', href: '/admin/audit', icon: 'shield' }, { label: 'Community website', href: '/', icon: 'globe' }] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; platformRole: string | null } | null>(null);
  useEffect(() => {
    apiFetch<{ name: string; platformRole: string | null }>('/auth/me', { store: false })
      .then((m) => (m.platformRole ? setMe(m) : router.replace('/erp')))
      .catch(() => router.replace('/login?next=/admin'));
  }, [router]);
  if (!me) return <div className="p-6 lg:pl-72"><Skeleton className="h-96" /></div>;
  return <Shell brand="PC Community" brandSub="Master admin" nav={NAV} user={{ name: me.name, role: label(me.platformRole!) }}>{children}</Shell>;
}
