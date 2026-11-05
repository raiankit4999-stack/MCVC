'use client';

import { useState } from 'react';
import { SalesArea } from '@/components/charts';
import { Alert, Card, Field, Input, PageHeader, Stat, Table, Td } from '@/components/ui';
import { useApi } from '@/lib/client-api';
import { money, todayIst } from '@/lib/format';

interface Sales { byProduct: { name: string; quantity: number; revenue: number }[]; byCategory: { category: string; revenue: number }[]; daily: { day: string; sales: number; profit: number }[] }
interface PL { revenue: number; costOfGoodsSold: number; repairPartsConsumed: number; grossProfit: number; note: string }
interface Gst { lines: { rate: number; hsnSac: string; taxable: number; cgst: number; sgst: number; igst: number }[]; totals: { taxable: number; cgst: number; sgst: number; igst: number }; disclaimer: string }

export default function Reports() {
  const monthStart = todayIst().slice(0, 8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayIst());
  const qs = `from=${from}T00:00:00%2B05:30&to=${to}T23:59:59%2B05:30`;
  const sales = useApi<Sales>(`/reports/sales?${qs}`);
  const pl = useApi<PL>(`/reports/profit-loss?${qs}`);
  const gst = useApi<Gst>(`/reports/gst?${qs}`);
  return (
    <>
      <PageHeader title="Reports" actions={<div className="flex gap-2"><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>} />
      {pl.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat icon="chart" label="Revenue (taxable)" value={money(pl.data.revenue, true)} />
          <Stat icon="box" label="Cost of goods sold" value={money(pl.data.costOfGoodsSold, true)} tone="amber" />
          <Stat icon="wrench" label="Repair parts consumed" value={money(pl.data.repairPartsConsumed, true)} tone="violet" />
          <Stat icon="tag" label="Gross profit" value={money(pl.data.grossProfit, true)} tone="green" />
        </div>
      )}
      <Card title="Daily sales" className="mt-6"><div className="p-4">{sales.data && <SalesArea data={sales.data.daily} />}</div></Card>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Sales by product">
          <Table head={['Item', 'Qty', 'Revenue']}>{sales.data?.byProduct.map((r) => <tr key={r.name}><Td className="max-w-xs truncate">{r.name}</Td><Td>{r.quantity}</Td><Td>{money(r.revenue)}</Td></tr>)}</Table>
        </Card>
        <Card title="Sales by category">
          <Table head={['Category', 'Revenue']}>{sales.data?.byCategory.map((r) => <tr key={r.category}><Td>{r.category}</Td><Td>{money(r.revenue)}</Td></tr>)}</Table>
        </Card>
      </div>
      <Card title="GST summary (tax invoices)" className="mt-6">
        {gst.data && <div className="p-4"><Alert tone="blue">{gst.data.disclaimer}</Alert></div>}
        <Table head={['Rate', 'HSN/SAC', 'Taxable', 'CGST', 'SGST', 'IGST']}>
          {gst.data?.lines.map((l) => <tr key={`${l.rate}-${l.hsnSac}`}><Td>{l.rate}%</Td><Td>{l.hsnSac}</Td><Td>{money(l.taxable)}</Td><Td>{money(l.cgst)}</Td><Td>{money(l.sgst)}</Td><Td>{money(l.igst)}</Td></tr>)}
          {gst.data && <tr className="font-semibold"><Td>Total</Td><Td /><Td>{money(gst.data.totals.taxable)}</Td><Td>{money(gst.data.totals.cgst)}</Td><Td>{money(gst.data.totals.sgst)}</Td><Td>{money(gst.data.totals.igst)}</Td></tr>}
        </Table>
      </Card>
      {pl.data && <p className="mt-4 text-xs text-slate-500">{pl.data.note}</p>}
    </>
  );
}
