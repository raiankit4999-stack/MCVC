'use client';

import { use, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Button, Card, Field, Input, Select, Skeleton, StatusBadge } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { date, dateTime, label, money } from '@/lib/format';

interface Invoice {
  id: string; invoiceNumber: string; docType: string; issuedAt: string; status: string; paymentStatus: string; placeOfSupply: string; isInterState: boolean;
  subtotal: string; discountTotal: string; taxableTotal: string; cgstTotal: string; sgstTotal: string; igstTotal: string; roundOff: string; grandTotal: string; amountPaid: string; balanceDue: string; notes: string | null;
  customerSnapshot: { name?: string; phone?: string; gstin?: string | null; address?: string | null };
  items: { id: string; description: string; hsnSac: string; quantity: string; unitPrice: string; discount: string; taxableValue: string; gstRate: string; cgst: string; sgst: string; igst: string; lineTotal: string; serialNumbers: string[] }[];
  payments: { id: string; amount: string; method: string; reference: string | null; receivedAt: string }[];
  seller: { name: string; legalName: string | null; gstin: string | null; addressLine: string; phone: string; email: string; stateCode: string; terms: string | null };
}

const TITLE: Record<string, string> = { TAX_INVOICE: 'Tax Invoice', BILL_OF_SUPPLY: 'Bill of Supply', QUOTATION: 'Quotation', PROFORMA: 'Proforma Invoice' };

export default function InvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { data: inv, reload } = useApi<Invoice>(`/invoices/${id}`);
  const [pay, setPay] = useState({ amount: '', method: 'CASH' });
  const [error, setError] = useState('');

  if (!inv) return <Skeleton className="h-[600px]" />;
  const isSale = ['TAX_INVOICE', 'BILL_OF_SUPPLY'].includes(inv.docType);

  async function recordPayment() {
    setError('');
    try {
      await apiFetch('/payments', { method: 'POST', body: { invoiceId: id, amount: Number(pay.amount), method: pay.method } });
      toast('Payment recorded');
      setPay({ ...pay, amount: '' });
      void reload();
    } catch (e) { setError(errorText(e)); }
  }
  async function cancel() {
    const reason = prompt('Reason for cancellation');
    if (!reason) return;
    try {
      await apiFetch(`/invoices/${id}/cancel`, { method: 'POST', body: { reason } });
      toast('Invoice cancelled — stock restored');
      void reload();
    } catch (e) { toast(errorText(e), 'error'); }
  }
  const share = () => {
    const text = `${inv.seller.name}: ${TITLE[inv.docType]} ${inv.invoiceNumber} for ${money(inv.grandTotal)}. Balance due ${money(inv.balanceDue)}.`;
    const phone = inv.customerSnapshot.phone?.replace('+', '');
    window.open(`https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-lg font-bold text-navy">{inv.seller.legalName ?? inv.seller.name}</p>
            <p className="text-sm text-slate-600">{inv.seller.addressLine}</p>
            <p className="text-sm text-slate-600">{inv.seller.phone} · {inv.seller.email}</p>
            {inv.seller.gstin && <p className="text-sm font-medium">GSTIN: {inv.seller.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-wide text-slate-900">{TITLE[inv.docType] ?? label(inv.docType)}</p>
            <p className="text-sm">No. <span className="font-semibold">{inv.invoiceNumber}</span></p>
            <p className="text-sm">Date {date(inv.issuedAt)}</p>
            <p className="text-sm">Place of supply: {inv.placeOfSupply}</p>
            {inv.status === 'CANCELLED' && <p className="mt-1 text-sm font-bold text-danger">CANCELLED</p>}
          </div>
        </header>
        <section className="py-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
          <p className="font-semibold">{inv.customerSnapshot.name ?? 'Walk-in customer'}</p>
          {inv.customerSnapshot.phone && <p>{inv.customerSnapshot.phone}</p>}
          {inv.customerSnapshot.gstin && <p>GSTIN: {inv.customerSnapshot.gstin}</p>}
        </section>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="p-2">#</th><th className="p-2">Item</th><th className="p-2">HSN/SAC</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Disc.</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">GST</th><th className="p-2 text-right">Amount</th>
            </tr></thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={it.id} className="border-b border-slate-100 align-top">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{it.description}{it.serialNumbers.length > 0 && <span className="block text-xs text-slate-500">S/N: {it.serialNumbers.join(', ')}</span>}</td>
                  <td className="p-2">{it.hsnSac}</td>
                  <td className="p-2 text-right">{Number(it.quantity)}</td>
                  <td className="p-2 text-right">{money(it.unitPrice)}</td>
                  <td className="p-2 text-right">{money(it.discount)}</td>
                  <td className="p-2 text-right">{money(it.taxableValue)}</td>
                  <td className="p-2 text-right">{Number(it.gstRate)}%</td>
                  <td className="p-2 text-right font-medium">{money(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <dl className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Taxable value</dt><dd>{money(inv.taxableTotal)}</dd></div>
            {inv.isInterState ? <div className="flex justify-between"><dt>IGST</dt><dd>{money(inv.igstTotal)}</dd></div> : <>
              <div className="flex justify-between"><dt>CGST</dt><dd>{money(inv.cgstTotal)}</dd></div>
              <div className="flex justify-between"><dt>SGST</dt><dd>{money(inv.sgstTotal)}</dd></div>
            </>}
            <div className="flex justify-between text-slate-500"><dt>Round off</dt><dd>{money(inv.roundOff)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Grand total</dt><dd>{money(inv.grandTotal)}</dd></div>
            {isSale && <><div className="flex justify-between"><dt>Paid</dt><dd>{money(inv.amountPaid)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{money(inv.balanceDue)}</dd></div></>}
          </dl>
        </div>
        {inv.seller.terms && <p className="mt-6 whitespace-pre-line border-t border-slate-200 pt-4 text-xs text-slate-500">{inv.seller.terms}</p>}
        <p className="mt-8 text-right text-xs text-slate-500">For {inv.seller.name} — Authorised signatory</p>
      </article>

      <aside className="no-print space-y-4">
        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Status</span>{inv.status === 'CANCELLED' ? <StatusBadge status="CANCELLED" /> : <StatusBadge status={isSale ? inv.paymentStatus : 'ISSUED'} />}</div>
          <Button className="w-full" variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button>
          <Button className="w-full" variant="secondary" onClick={share}>Share on WhatsApp</Button>
          {inv.status === 'ISSUED' && Number(inv.amountPaid) === 0 && <Button className="w-full" variant="ghost" onClick={cancel}>Cancel invoice</Button>}
        </Card>
        {isSale && inv.status === 'ISSUED' && Number(inv.balanceDue) > 0 && (
          <Card title="Record payment" className="p-0">
            <div className="space-y-3 p-4">
              {error && <Alert>{error}</Alert>}
              <Field label="Amount ₹"><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder={inv.balanceDue} /></Field>
              <Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Button className="w-full" onClick={recordPayment} disabled={!pay.amount}>Record payment</Button>
            </div>
          </Card>
        )}
        {inv.payments.length > 0 && (
          <Card title="Payments">
            <ul className="divide-y divide-slate-100 text-sm">{inv.payments.map((p) => <li key={p.id} className="flex justify-between px-4 py-2"><span>{p.method} <span className="text-xs text-slate-500">{dateTime(p.receivedAt)}</span></span><span className="font-medium">{money(p.amount)}</span></li>)}</ul>
          </Card>
        )}
      </aside>
    </div>
  );
}
