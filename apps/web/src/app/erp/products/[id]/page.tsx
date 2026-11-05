'use client';

import { use } from 'react';
import { Badge, Card, PageHeader, Skeleton, StatusBadge, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { dateTime, label, money } from '@/lib/format';

interface P {
  id: string; name: string; sku: string; brand: string | null; hsnCode: string; gstRate: string; mrp: string; purchasePrice: string; sellingPrice: string; stockOnHand: number; reorderLevel: number; warrantyMonths: number; isSerialized: boolean; specs: Record<string, string>;
  serials: { id: string; serialNumber: string; status: string; warrantyEnd: string | null }[];
  movements: { id: string; movementType: string; quantity: number; note: string | null; referenceType: string | null; createdAt: string }[];
}

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p } = useApi<P>(`/products/${id}`);
  if (!p) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHeader title={p.name} subtitle={`${p.sku} · HSN ${p.hsnCode} · GST ${Number(p.gstRate)}%`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[['In stock', p.stockOnHand], ['Selling price', money(p.sellingPrice)], ['Purchase price', money(p.purchasePrice)], ['MRP', money(p.mrp)]].map(([l, v]) => (
          <Card key={l as string} className="p-4"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-semibold">{v}</p></Card>
        ))}
      </div>
      {Object.keys(p.specs).length > 0 && <Card title="Specifications" className="mt-6"><dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">{Object.entries(p.specs).map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{label(k)}</dt><dd className="text-sm font-medium">{v}</dd></div>)}</dl></Card>}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {p.isSerialized && (
          <Card title={`Serial numbers (${p.serials.length})`}>
            <Table head={['Serial', 'Status', 'Warranty until']}>
              {p.serials.map((s) => <tr key={s.id}><Td className="font-mono text-xs">{s.serialNumber}</Td><Td><StatusBadge status={s.status} /></Td><Td>{s.warrantyEnd ? new Date(s.warrantyEnd).toLocaleDateString('en-IN') : '—'}</Td></tr>)}
            </Table>
          </Card>
        )}
        <Card title="Stock ledger">
          <Table head={['When', 'Movement', 'Qty', 'Reference']}>
            {p.movements.map((m) => <tr key={m.id}><Td>{dateTime(m.createdAt)}</Td><Td><Badge tone={m.quantity > 0 ? 'green' : 'amber'}>{label(m.movementType)}</Badge></Td><Td className="font-medium">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td><Td className="text-xs text-slate-500">{m.note ?? m.referenceType ?? '—'}</Td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
