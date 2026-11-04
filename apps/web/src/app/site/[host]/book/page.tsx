import { api } from '@/lib/server-api';
import type { PubService } from '../page';
import { hostFrom } from '../data';
import { BookingForm } from './booking-form';

export const metadata = { title: 'Book a service' };

export default async function Book({ params, searchParams }: { params: Promise<{ host: string }>; searchParams: Promise<{ service?: string }> }) {
  const host = hostFrom((await params).host);
  const services = (await api<PubService[]>('/public/store/services', { host })).filter((s) => s.isBookable);
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>Book a service</h1>
      <p className="mt-2 text-slate-600">Choose a service and a time that suits you. Slots are reserved instantly and confirmed by the store.</p>
      <BookingForm host={host} services={services.map((s) => ({ id: s.id, name: s.name, price: s.price }))} initialService={(await searchParams).service} />
    </div>
  );
}
