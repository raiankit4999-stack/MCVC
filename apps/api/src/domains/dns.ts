import { promises as dns } from 'node:dns';

export const DNS_RESOLVER = Symbol('DNS_RESOLVER');

export interface DnsResolver {
  txt(hostname: string): Promise<string[]>;
  cname(hostname: string): Promise<string[]>;
  a(hostname: string): Promise<string[]>;
}

const safe = async <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);

export const systemDnsResolver: DnsResolver = {
  txt: async (h) => (await safe(dns.resolveTxt(h))).map((chunks) => chunks.join('')),
  cname: (h) => safe(dns.resolveCname(h)),
  a: (h) => safe(dns.resolve4(h)),
};
