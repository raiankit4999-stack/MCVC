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
  association: { name: string; code: string | null; slug: string } | null;
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
  objectives?: string[];
  contacts: { label: string; email: string }[];
}
export interface CommunityProfile { name: string; tagline: string | null; settings: { parent?: ParentBody }; stats: { stores: number; cities: number; associations: number } }
export const ZONE_ORDER = ['Central Zone 1', 'Central Zone 2', 'South Zone', 'Saurashtra Zone', 'North Zone', 'Kutch Zone'];

export interface OfficeBearer { post: string; name: string; firm: string | null }
export interface Association {
  id: string; slug: string; name: string; code: string | null; zone: string; sourceUrl: string | null;
  officeBearers: OfficeBearer[]; memberCount: number; city: { name: string; slug: string };
}
export interface AssociationDetail extends Association {
  members: { id: string; name: string; slug: string; isVerified: boolean; websiteStatus: string; area: { name: string } }[];
}
export interface TeamMember { section: string; photo: string | null; name: string; role: string | null; city: string | null }
export interface Network {
  team: TeamMember[];
  events: { slug: string; title: string; images: string[] }[];
  gallery: { caption: string; images: string[] }[];
  serviceCentres: { brand: string; address: string; phone: string; email: string; tollFree: string; hours: string }[];
  usefulLinks: { group: string; links: { label: string; url: string }[] }[];
}
