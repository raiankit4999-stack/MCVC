import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { apiOrNull } from '@/lib/server-api';

export interface PublicStore {
  id: string; name: string; slug: string; phone: string; email: string; addressLine: string; city: string; area: string; gstin: string | null; isVerified: boolean; rating: number; ratingCount: number; primaryDomain: string | null;
  branding: {
    logoUrl: string | null; tagline: string | null; about: string | null; heroImageUrl: string | null; heroHeadline: string | null; primaryColor: string; accentColor: string; fontPreset: string;
    whatsappNumber: string | null; socialLinks: Record<string, string>; businessHours: { day: number; open: string; close: string }[]; footerText: string | null; seoTitle: string | null; seoDescription: string | null;
  };
}

export const hostFrom = (raw: string) => decodeURIComponent(raw).toLowerCase();

export const getStore = cache(async (host: string) => {
  const s = await apiOrNull<PublicStore>('/public/store', { host, revalidate: 30 });
  if (!s) notFound();
  return s;
});

/** Links are root-relative on the store's own domain, and prefixed when previewed via /site/<host>. */
export async function basePath(host: string) {
  return (await headers()).get('x-site-rewritten') ? '' : `/site/${host}`;
}

export const FONTS: Record<string, string> = {
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  geist: '"Geist", Inter, ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", Inter, ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};
