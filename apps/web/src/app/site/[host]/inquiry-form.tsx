'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, errorText } from '@/lib/client-api';

export function InquiryForm({ host, productId, defaultMessage }: { host: string; productId?: string; defaultMessage?: string }) {
  const [state, setState] = useState<'idle' | 'sent' | string>('idle');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await apiFetch('/public/store/inquiries', { method: 'POST', host, store: false, body: { ...f, productId } });
      setState('sent');
    } catch (err) { setState(errorText(err)); }
  }
  if (state === 'sent') return <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">Thanks! The store will contact you shortly.</p>;
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2">
      <input name="name" required placeholder="Your name" className="h-10 rounded-lg border-0 px-3 text-sm ring-1 ring-slate-200" />
      <input name="phone" required placeholder="Mobile number" inputMode="tel" className="h-10 rounded-lg border-0 px-3 text-sm ring-1 ring-slate-200" />
      <textarea name="message" required defaultValue={defaultMessage} rows={2} className="rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-200 sm:col-span-2" />
      {state !== 'idle' && <p className="text-sm text-red-700 sm:col-span-2">{state}</p>}
      <button className="h-10 rounded-lg text-sm font-semibold text-white sm:col-span-2" style={{ background: 'var(--brand)' }}>Send inquiry</button>
    </form>
  );
}
