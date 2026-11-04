'use client';

import { useToast } from '@/components/toast';
import { Card, Empty, PageHeader, Select, Table, Td } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { dateTime } from '@/lib/format';

interface L { id: string; name: string; phone: string; email: string | null; source: string; message: string | null; status: string; createdAt: string }

export default function Leads() {
  const toast = useToast();
  const { data, reload } = useApi<L[]>('/leads?pageSize=100');
  const set = async (id: string, status: string) => {
    try { await apiFetch(`/leads/${id}`, { method: 'PATCH', body: { status } }); toast('Lead updated'); void reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <>
      <PageHeader title="Leads & inquiries" subtitle="Website inquiries and walk-in leads" />
      <Card>
        {data?.length ? (
          <Table head={['Received', 'Name', 'Phone', 'Source', 'Message', 'Status']}>
            {data.map((l) => (
              <tr key={l.id}>
                <Td>{dateTime(l.createdAt)}</Td><Td className="font-medium">{l.name}</Td><Td><a className="text-brand" href={`tel:${l.phone}`}>{l.phone}</a></Td><Td>{l.source.split(':')[0]}</Td>
                <Td className="max-w-xs whitespace-normal text-xs">{l.message}</Td>
                <Td><Select value={l.status} onChange={(e) => set(l.id, e.target.value)} className="h-8 w-32 text-xs">{['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'].map((s) => <option key={s}>{s}</option>)}</Select></Td>
              </tr>
            ))}
          </Table>
        ) : <Empty icon="bell" title={data ? 'No leads yet' : 'Loading…'}>Inquiries from your website appear here.</Empty>}
      </Card>
    </>
  );
}
