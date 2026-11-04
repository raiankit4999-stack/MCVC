'use client';

import { createContext, useContext } from 'react';

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  stateCode: string;
  timezone: string;
  websiteStatus: string;
  membershipStatus: string;
  role: string;
  permissions: string[];
  settings: Record<string, unknown> & { primaryColor: string; allowedGstRates: string[] };
  city: { name: string };
  area: { name: string };
  subscriptions: { status: string; currentPeriodEnd: string; plan: { name: string } }[];
}

export const StoreCtx = createContext<{ store: StoreInfo; reload: () => void } | null>(null);
export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore outside ERP');
  return v;
}
export const can = (s: StoreInfo, p: string) => s.permissions.includes(p);
