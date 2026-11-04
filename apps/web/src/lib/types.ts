export interface StoreCard {
  id: string;
  name: string;
  slug: string;
  city: { name: string; slug: string };
  area: { name: string; slug: string };
  addressLine: string;
  phone: string;
  logoUrl: string | null;
  tagline: string | null;
  primaryColor: string;
  isVerified: boolean;
  isFeatured: boolean;
  rating: number;
  ratingCount: number;
  categories: { name: string; slug: string; kind: 'PRODUCT' | 'SERVICE' }[];
  websitePublished: boolean;
  primaryDomain: string | null;
  isOpen: boolean | null;
}
export interface City { id: string; name: string; slug: string; state: string; storeCount: number }
export interface Area { id: string; name: string; slug: string; cityId: string; city: { slug: string; name: string } }
export interface Category { id: string; name: string; slug: string; kind: 'PRODUCT' | 'SERVICE' }
export interface Plan { id: string; code: string; name: string; description: string | null; priceMonthly: string; priceYearly: string; features: string[] }
