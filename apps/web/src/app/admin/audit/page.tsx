'use client';

import { Card, Empty, PageHeader, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { dateTime } from '@/lib/format';

interface Log { id: string; action: string; entityType: string; entityId: string | null; userId: string | null; tenantId: string | null; metadata: unknown; ip: string | null; createdAt: string }

export default function Audit() {
  const { data } = useApi<Log[]>('/master/audit-logs?pageSize=100');
  return (
    <>
      <PageHeader title="Audit log" subtitle="Append-only record of administrative and store configuration actions." />
      <Card>
        {data?.length ? (
          <Table head={['When', 'Action', 'Entity', 'Actor', 'Details']}>
            {data.map((l) => <tr key={l.id}><Td>{dateTime(l.createdAt)}</Td><Td className="font-medium">{l.action}</Td><Td className="text-xs">{l.entityType} {l.entityId?.slice(0, 8)}</Td><Td className="font-mono text-xs">{l.userId?.slice(0, 8) ?? 'system'}</Td><Td className="max-w-md truncate font-mono text-xs text-slate-500">{JSON.stringify(l.metadata)}</Td></tr>)}
          </Table>
        ) : <Empty icon="shield" title={data ? 'No activity yet' : 'Loading…'} />}
      </Card>
    </>
  );
}
