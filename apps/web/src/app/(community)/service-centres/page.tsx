import { api } from '@/lib/server-api';
import type { Network } from '@/lib/types';
import { CentreTable } from './table';

export const metadata = { title: 'Brand service centres' };
export const dynamic = 'force-dynamic';

export default async function ServiceCentres() {
  const n = await api<Network>('/community/network');
  return (
    <>
      <section className="hero-bg px-4 pb-12 pt-12 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Brand service centres</h1>
          <p className="mt-2 max-w-2xl text-stone-300">Authorised service centres for computer brands — addresses, phone numbers, toll-free lines and timings.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><CentreTable rows={n.serviceCentres} /></div>
    </>
  );
}
