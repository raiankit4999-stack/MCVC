import { notFound } from 'next/navigation';
import { apiOrNull } from '@/lib/server-api';
import { hostFrom } from '../../data';
import { Tracker, TrackView } from './tracker';

export const metadata = { title: 'Repair status', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Track({ params }: { params: Promise<{ host: string; token: string }> }) {
  const { host: raw, token } = await params;
  const host = hostFrom(raw);
  const view = await apiOrNull<TrackView>(`/public/store/repair-tracking/${encodeURIComponent(token)}`, { host, revalidate: 0 });
  if (!view) notFound();
  return <Tracker host={host} token={token} initial={view} />;
}
