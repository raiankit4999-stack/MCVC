'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, ButtonLink, Card, Empty, Input, PageHeader, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { money } from '@/lib/format';

interface P { id: string; name: string; sku: string; brand: string | null; sellingPrice: string; gstRate: string; stockOnHand: number; reorderLevel: number; isSerialized: boolean; isPublished: boolean; category: { name: string } | null }

export default function Products() {
  const [q, setQ] = useState('');
  const { data } = useApi<{ total: number; items: P[] }>(`/products?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  return (
    <>
      <PageHeader title="Products" subtitle={data ? `${data.total} products` : undefined} actions={<ButtonLink href="/erp/products/new">Add product</ButtonLink>} />
      <Card>
        <div className="border-b border-slate-100 p-4"><Input placeholder="Search name, SKU, barcode or serial" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>
        {data?.items.length ? (
          <Table head={['Product', 'SKU', 'Category', 'Price', 'GST', 'Stock', '']}>
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td><Link href={`/erp/products/${p.id}`} className="font-medium text-slate-900 hover:text-brand">{p.name}</Link>{p.brand && <span className="block text-xs text-slate-500">{p.brand}</span>}</Td>
                <Td className="font-mono text-xs">{p.sku}</Td>
                <Td>{p.category?.name ?? '—'}</Td>
                <Td>{money(p.sellingPrice)}</Td>
                <Td>{Number(p.gstRate)}%</Td>
                <Td><span className={p.stockOnHand <= p.reorderLevel ? 'font-semibold text-amber-700' : ''}>{p.stockOnHand}</span></Td>
                <Td>{p.isSerialized && <Badge tone="violet">Serialized</Badge>} {!p.isPublished && <Badge>Hidden</Badge>}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon="box" title={data ? 'No products yet' : 'Loading…'}>Add your first product to start billing.</Empty>
        )}
      </Card>
    </>
  );
}
