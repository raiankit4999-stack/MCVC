'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, errorText } from '@/lib/client-api';
import { money, time } from '@/lib/format';

interface Slot { startsAt: string; remaining: number; available: boolean }
const STEPS = ['Service', 'Schedule', 'Your details'];

function nextDays(n: number) {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + i * 86400_000)));
  return out;
}

export function BookingForm({ host, services, initialService }: { host: string; services: { id: string; name: string; price: string }[]; initialService?: string }) {
  const [service, setService] = useState(initialService && services.some((s) => s.id === initialService) ? initialService : services[0]?.id ?? '');
  const days = nextDays(10);
  const [day, setDay] = useState(days[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState('');
  const [done, setDone] = useState<{ reference: string; slotStart: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSlots(null);
    setSlot('');
    void apiFetch<Slot[]>(`/public/store/slots?date=${day}`, { host, store: false }).then(setSlots).catch(() => setSlots([]));
  }, [day, host]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError('');
    try {
      setDone(await apiFetch('/public/store/bookings', { method: 'POST', host, store: false, body: { name: f.name, phone: f.phone, email: f.email || undefined, serviceId: service || undefined, slotStart: slot, deviceType: f.deviceType, deviceModel: f.deviceModel || undefined, problem: f.problem || undefined, pickupRequired: f.pickup === 'on' } }));
    } catch (err) {
      setError(errorText(err));
      if (String(err).includes('booked')) void apiFetch<Slot[]>(`/public/store/slots?date=${day}`, { host, store: false }).then(setSlots);
    } finally { setBusy(false); }
  }

  if (done) return (
    <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
      <p className="text-xl font-bold text-green-900">Booking received</p>
      <p className="mt-2 text-green-800">Reference <span className="font-mono font-bold">{done.reference}</span> · {new Date(done.slotStart).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
      <p className="mt-2 text-sm text-green-700">The store will confirm your appointment on WhatsApp.</p>
    </div>
  );

  const step = !service ? 0 : !slot ? 1 : 2;
  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <ol className="flex gap-4 text-xs font-medium">{STEPS.map((s, i) => <li key={s} className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: i <= step ? 'var(--brand)' : '#cbd5e1' }}>{i + 1}</span><span className={i <= step ? 'text-slate-900' : 'text-slate-400'}>{s}</span></li>)}</ol>
      <fieldset>
        <legend className="mb-3 font-semibold">1. Select service</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl p-4 ring-1 ${service === s.id ? 'ring-2 ring-[var(--brand)]' : 'ring-slate-200'}`}>
              <span className="flex items-center gap-3"><input type="radio" name="service" checked={service === s.id} onChange={() => setService(s.id)} className="text-[var(--brand)]" />{s.name}</span>
              <span className="text-sm text-slate-500">from {money(s.price, true)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-semibold">2. Choose date &amp; time</legend>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const dt = new Date(`${d}T12:00:00+05:30`);
            return <button type="button" key={d} onClick={() => setDay(d)} className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2 text-sm ring-1 ${day === d ? 'text-white ring-transparent' : 'ring-slate-200'}`} style={day === d ? { background: 'var(--brand)' } : {}}><span className="text-xs opacity-80">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span><span className="text-lg font-bold">{dt.getDate()}</span></button>;
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots === null ? <p className="col-span-full text-sm text-slate-500">Loading slots…</p> : slots.length === 0 ? <p className="col-span-full text-sm text-slate-500">The store is closed on this day.</p> : slots.map((s) => (
            <button type="button" key={s.startsAt} disabled={!s.available} onClick={() => setSlot(s.startsAt)} className={`h-10 rounded-lg text-sm font-medium ring-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${slot === s.startsAt ? 'text-white ring-transparent' : 'ring-slate-200'}`} style={slot === s.startsAt ? { background: 'var(--brand)' } : {}} aria-pressed={slot === s.startsAt}>
              {time(s.startsAt)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">3. Your details</legend>
        <input name="name" required placeholder="Full name" className="h-11 rounded-lg border-0 px-3 ring-1 ring-slate-200" />
        <input name="phone" required placeholder="Mobile number" inputMode="tel" className="h-11 rounded-lg border-0 px-3 ring-1 ring-slate-200" />
        <input name="email" type="email" placeholder="Email (optional)" className="h-11 rounded-lg border-0 px-3 ring-1 ring-slate-200" />
        <select name="deviceType" className="h-11 rounded-lg border-0 px-3 ring-1 ring-slate-200">{['Laptop', 'Desktop', 'Printer', 'Other'].map((d) => <option key={d}>{d}</option>)}</select>
        <input name="deviceModel" placeholder="Device model (e.g. HP Pavilion 15)" className="h-11 rounded-lg border-0 px-3 ring-1 ring-slate-200 sm:col-span-2" />
        <textarea name="problem" rows={3} placeholder="Describe the problem" className="rounded-lg border-0 px-3 py-2 ring-1 ring-slate-200 sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="pickup" /> I need pickup &amp; drop</label>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={!slot || busy} className="h-12 w-full rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand)' }}>{busy ? 'Booking…' : 'Confirm booking'}</button>
    </form>
  );
}
