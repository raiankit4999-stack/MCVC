/**
 * Network data from the parent body, FITAG — Federation of Information Technology
 * Associations of Gujarat (https://fitag.in). Each entry is a member association's
 * city. Association names/codes are as published by FITAG; null where not listed.
 */
export interface NetworkCity {
  name: string;
  slug: string;
  zone: string;
  associationName: string | null;
  associationCode: string | null;
  stateCode?: string; // defaults to Gujarat (24)
  state?: string;
  areas?: [string, string?][];
}

const C = (name: string, zone: string, associationName: string | null, associationCode: string | null, extra: Partial<NetworkCity> = {}): NetworkCity => ({
  name,
  slug: extra.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  zone,
  associationName,
  associationCode,
  ...extra,
});

export const FITAG_NETWORK: NetworkCity[] = [
  C('Ahmedabad', 'Central Zone 1', 'Ahmedabad Computer Merchant Association', 'ACMA', { areas: [['Navrangpura', '380009'], ['Satellite', '380015'], ['Maninagar', '380008'], ['CG Road', '380006'], ['Relief Road', '380001']] }),
  C('Gandhinagar', 'Central Zone 1', 'Gandhinagar Computer Hardware Association', 'GCHA'),
  C('Morbi', 'Central Zone 1', 'Morbi Information Technology Association', 'MITA'),
  C('Surendranagar', 'Central Zone 1', 'Surendranagar Computer Merchant Association', 'SCMA'),
  C('Zalawad', 'Central Zone 1', 'Zalawad Information Technology Association', 'ZITA'),

  C('Nadiad', 'Central Zone 2', 'Computer Association of Nadiad', 'CAN', { areas: [['College Road', '387001'], ['Santram Road', '387001'], ['Station Road', '387001'], ['Kheda', '387411']] }),
  C('Vadodara', 'Central Zone 2', 'Baroda Information Technology Association', 'BITA', { slug: 'vadodara', areas: [['Alkapuri', '390007'], ['Sayajigunj', '390020'], ['Raopura', '390001']] }),
  C('Anand', 'Central Zone 2', 'Charotar Information Technology Association', 'CHITA', { areas: [['Vallabh Vidyanagar', '388120'], ['Station Road', '388001'], ['Ganesh Chowkdi', '388001']] }),
  C('Bharuch', 'Central Zone 2', 'Ankleshwar / Bharuch Information Technology Association', 'ABITA', { areas: [['Bharuch', '392001'], ['Ankleshwar', '393001']] }),
  C('Godhra', 'Central Zone 2', 'Godhara Computer Association', 'GCA'),

  C('Surat', 'South Zone', 'Surat Computer Association', 'SCA', { areas: [['Ring Road', '395002'], ['Adajan', '395009'], ['Varachha', '395006']] }),
  C('Bardoli', 'South Zone', null, null),
  C('Valsad', 'South Zone', 'Valsad Association of Information Technologies', 'VAIT'),
  C('Vapi', 'South Zone', 'Vapi Information Technology Association', 'VITA'),
  C('Silvassa', 'South Zone', 'Information Technology Association of Silvassa', 'ITAS', { stateCode: '26', state: 'Dadra and Nagar Haveli and Daman and Diu' }),

  C('Rajkot', 'Saurashtra Zone', 'Rajkot Computer Traders Association', 'RCTA', { areas: [['Dr. Yagnik Road', '360001'], ['Tagore Road', '360002'], ['Kalawad Road', '360005']] }),
  C('Jamnagar', 'Saurashtra Zone', 'Nawanagar IT Association', 'NIA'),
  C('Junagadh', 'Saurashtra Zone', 'Junagadh Information Technology Association', 'JITA'),
  C('Bhavnagar', 'Saurashtra Zone', 'Bhavanagar Information Technology Association', 'BITA'),
  C('Amreli', 'Saurashtra Zone', 'Amreli District Information Technology Association', 'ADITA'),
  C('Botad', 'Saurashtra Zone', 'Botad IT Association', null),
  C('Gondal', 'Saurashtra Zone', 'Gondal Computer Traders Association', 'GCTA'),
  C('Mahuva', 'Saurashtra Zone', null, null),
  C('Porbandar', 'Saurashtra Zone', 'Computer Traders Association Porbandar', 'CTAP'),

  C('Mehsana', 'North Zone', 'Mehsana Computer Merchant Association', 'MCMA'),
  C('Palanpur', 'North Zone', 'Palanpur Information Technology Association', 'PITA'),
  C('Patan', 'North Zone', 'Patan Computer Merchant Association', 'PCMA'),
  C('Deesa', 'North Zone', 'Deesa Computer Merchant Association', 'DCMA'),
  C('Himatnagar', 'North Zone', 'Himatnagar Information Technology Association', 'HITA'),
  C('Visnagar', 'North Zone', 'Visnagar Computer Merchant Association', 'VCMA'),
  C('Siddhpur', 'North Zone', null, null),
  C('Tharad', 'North Zone', 'Tharad – Waw Information Technology Association', 'TWCIA'),

  C('Bhuj', 'Kutch Zone', 'Association of Bhuj Computer Dealer', 'ABCD'),
  C('Gandhidham', 'Kutch Zone', 'Gandhidham Information Technology Welfare Association', 'GITA'),
  C('Mandvi', 'Kutch Zone', 'Mandvi Computer Dealer Association', 'MCDA'),
  C('Mundra', 'Kutch Zone', null, null),
  C('Anjar', 'Kutch Zone', null, null),
];

export const ZONE_ORDER = ['Central Zone 1', 'Central Zone 2', 'South Zone', 'Saurashtra Zone', 'North Zone', 'Kutch Zone'];

import fitagData from './fitag-data.json';

/** Scraped from fitag.in (WordPress API): associations, team, events, gallery, service centres, links. */
export interface FitagAssociation { slug: string; name: string; code: string | null; zone: string; city: string; officeBearers: { post: string; name: string; firm: string | null }[]; firms: string[]; source: string }
export const FITAG_DATA = fitagData as unknown as {
  associations: FitagAssociation[];
  team: { section: string; photo: string | null; name: string; role: string | null; city: string | null; years?: string | null; phone?: string | null; email?: string | null }[];
  leaders: { post: string; name: string; zone: string | null; association: string | null; code: string | null; associationSlug: string | null; phone: string | null; email: string | null; photo: string | null }[];
  photoWall: string[];
  events: { slug: string; title: string; images: string[] }[];
  gallery: { caption: string; images: string[] }[];
  serviceCentres: { brand: string; address: string; phone: string; email: string; tollFree: string; hours: string }[];
  usefulLinks: { group: string; links: { label: string; url: string }[] }[];
  contacts: { label: string; email: string }[];
};

/** Parent-body profile shown on the community website (published by FITAG). */
export const FITAG_PROFILE = {
  name: 'FITAG — Federation of Information Technology Associations of Gujarat',
  shortName: 'FITAG',
  url: 'https://fitag.in',
  motto: 'FITAG Means Business',
  stats: { associations: 43, partners: '4,200+', annualBusiness: 'US$ 1 Billion+' },
  agenda: [
    { title: 'Flourish', text: 'To flourish and co-exist by being united and supportive to each other.' },
    { title: 'Knowledge', text: 'To share the knowledge available by all means — programmes like ABCD, GST seminars and IT-Yatra.' },
    { title: 'Networking', text: 'To increase awareness by extensive networking, including exhibitions across India and abroad.' },
    { title: 'Strength', text: 'To stay united and utilise the strength of the whole fraternity.' },
    { title: 'Protection', text: 'To protect the common interest of members.' },
  ],
  objectives: [
    'Protect and promote the interest of the IT business community',
    'Promote honourable trade practices and prevent malpractices',
    'Represent the fraternity to local, state and central authorities',
    'Advance commercial and technical education for members',
    'Resolve trade disputes through arbitration and a code of conduct',
  ],
  committee: FITAG_DATA.team.filter((t) => t.section === 'Core Committee').slice(0, 5).map((t) => ({ name: t.name, role: t.role ?? '' })),
  contacts: FITAG_DATA.contacts,
};
