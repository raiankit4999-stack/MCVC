'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { NavItem, NavSection, Shell } from '@/components/shell';
import { Select, Skeleton } from '@/components/ui';
import { apiFetch, ClientApiError, getStoreId, setStoreId } from '@/lib/client-api';
import { StoreCtx, StoreInfo } from './context';

/** Permission needed to open each page (pages a role can't use are hidden from its menu). */
const NEEDS: Record<string, string> = {
  '/erp/pos': 'invoices.write', '/erp/invoices': 'invoices.read', '/erp/products': 'products.read', '/erp/inventory': 'inventory.read',
  '/erp/repairs': 'repairs.read', '/erp/services': 'services.read', '/erp/customers': 'customers.read', '/erp/bookings': 'bookings.read',
  '/erp/leads': 'leads.read', '/erp/reports': 'reports.view', '/erp/settings': 'settings.manage',
};
const TABS: NavItem[] = [
  { label: 'Home', href: '/erp', icon: 'home' },
  { label: 'Sale', href: '/erp/pos', icon: 'receipt' },
  { label: 'Repairs', href: '/erp/repairs', icon: 'wrench' },
  { label: 'Bookings', href: '/erp/bookings', icon: 'calendar' },
  { label: 'Products', href: '/erp/products', icon: 'box' },
];

const NAV: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', href: '/erp', icon: 'home' }] },
  { title: 'Sales', items: [{ label: 'POS / New sale', href: '/erp/pos', icon: 'receipt' }, { label: 'Invoices', href: '/erp/invoices', icon: 'file' }] },
  { title: 'Inventory', items: [{ label: 'Products', href: '/erp/products', icon: 'box' }, { label: 'Stock & purchases', href: '/erp/inventory', icon: 'layers' }] },
  { title: 'Services', items: [{ label: 'Repair jobs', href: '/erp/repairs', icon: 'wrench' }, { label: 'Service catalogue', href: '/erp/services', icon: 'cpu' }] },
  { title: 'Customers', items: [{ label: 'Customers', href: '/erp/customers', icon: 'users' }, { label: 'Bookings', href: '/erp/bookings', icon: 'calendar' }, { label: 'Leads', href: '/erp/leads', icon: 'bell' }] },
  { title: 'Management', items: [{ label: 'Reports', href: '/erp/reports', icon: 'chart' }, { label: 'Website & branding', href: '/erp/settings', icon: 'globe' }] },
];

interface Me { name: string; memberships: { id: string; name: string }[] }

export default function ErpLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const m = await apiFetch<Me>('/auth/me', { store: false });
      if (!m.memberships.length) return router.replace('/join');
      if (!m.memberships.some((x) => x.id === getStoreId())) setStoreId(m.memberships[0].id);
      setMe(m);
      setStore(await apiFetch<StoreInfo>('/store'));
    } catch (e) {
      if (e instanceof ClientApiError && e.status === 401) return router.replace('/login?next=/erp');
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="p-10 text-center text-sm text-danger">{error}</div>;
  if (!me || !store)
    return (
      <div className="space-y-4 p-6 lg:pl-72">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );

  return (
    <StoreCtx.Provider value={{ store, reload: load }}>
      <Shell
        tabs={TABS.filter((t) => !NEEDS[t.href] || store.permissions.includes(NEEDS[t.href])).slice(0, 4)}
        brand={store.name}
        brandSub={`${store.area.name}, ${store.city.name}`}
        nav={NAV.map((sec) => ({ ...sec, items: sec.items.filter((i) => !NEEDS[i.href] || store.permissions.includes(NEEDS[i.href])) })).filter((sec) => sec.items.length)}
        user={{ name: me.name, role: `${store.role} · ${store.name}` }}
        topRight={
          me.memberships.length > 1 ? (
            <Select aria-label="Switch store" className="hidden w-48 sm:block" value={store.id} onChange={(e) => { setStoreId(e.target.value); location.reload(); }}>
              {me.memberships.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          ) : undefined
        }
      >
        {children}
      </Shell>
    </StoreCtx.Provider>
  );
}
