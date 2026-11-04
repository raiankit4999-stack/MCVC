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
export interface City { id: string; name: string; slug: string; state: string; storeCount: number; zone: string | null; associationName: string | null; associationCode: string | null }
export interface Area { id: string; name: string; slug: string; cityId: string; city: { slug: string; name: string } }
export interface Category { id: string; name: string; slug: string; kind: 'PRODUCT' | 'SERVICE' }
export interface Plan { id: string; code: string; name: string; description: string | null; priceMonthly: string; priceYearly: string; features: string[] }

export interface ParentBody {
  name: string; shortName: string; url: string; motto: string;
  stats: { associations: number; partners: string; annualBusiness: string };
  agenda: { title: string; text: string }[];
  committee: { name: string; role: string }[];
  contacts: { label: string; email: string }[];
}
export interface CommunityProfile { name: string; tagline: string | null; settings: { parent?: ParentBody }; stats: { stores: number; cities: number } }
export const ZONE_ORDER = ['Central Zone 1', 'Central Zone 2', 'South Zone', 'Saurashtra Zone', 'North Zone', 'Kutch Zone'];
