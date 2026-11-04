'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink, Card, Empty, Input, PageHeader, Select, StatusBadge, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { date, label, money } from '@/lib/format';

interface Inv { id: string; invoiceNumber: string; docType: string; issuedAt: string; grandTotal: string; amountPaid: string; paymentStatus: string; status: string; customer: { name: string; phone: string } | null }

export default function Invoices() {
  const [q, setQ] = useState('');
  const [docType, setDocType] = useState('');
  const { data } = useApi<{ total: number; items: Inv[] }>(`/invoices?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}${docType ? `&docType=${docType}` : ''}`);
  return (
    <>
      <PageHeader title="Invoices & quotations" subtitle={data ? `${data.total} documents` : undefined} actions={<ButtonLink href="/erp/pos">New sale</ButtonLink>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <Input placeholder="Search number, customer or phone" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-48">
            <option value="">All types</option>
            {['TAX_INVOICE', 'BILL_OF_SUPPLY', 'QUOTATION', 'PROFORMA'].map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </Select>
        </div>
        {data?.items.length ? (
          <Table head={['Number', 'Type', 'Date', 'Customer', 'Total', 'Paid', 'Status']}>
            {data.items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <Td><Link href={`/erp/invoices/${i.id}`} className="font-medium text-brand">{i.invoiceNumber}</Link></Td>
                <Td>{label(i.docType)}</Td>
                <Td>{date(i.issuedAt)}</Td>
                <Td>{i.customer?.name ?? 'Walk-in'}</Td>
                <Td className="font-medium">{money(i.grandTotal)}</Td>
                <Td>{money(i.amountPaid)}</Td>
                <Td>{i.status === 'CANCELLED' ? <StatusBadge status="CANCELLED" /> : ['QUOTATION', 'PROFORMA'].includes(i.docType) ? <StatusBadge status="ISSUED" /> : <StatusBadge status={i.paymentStatus} />}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon="receipt" title={data ? 'No invoices found' : 'Loading…'} />
        )}
      </Card>
    </>
  );
}
