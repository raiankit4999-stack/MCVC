'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '@/components/ui';
import { apiFetch, errorText, useApi } from '@/lib/client-api';
import { can, useStore } from '../context';

interface Domains { platformHostname: string; cnameTarget: string; domains: { id: string; hostname: string; isPrimary: boolean; verificationStatus: string; instructions: { type: string; name: string; value: string; purpose: string }[] }[] }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const { store, reload } = useStore();
  const toast = useToast();
  const s = store.settings as unknown as Record<string, string | null> & { businessHours: { day: number; open: string; close: string }[] };
  const [error, setError] = useState('');
  const [color, setColor] = useState(String(s.primaryColor));
  const [hours, setHours] = useState(DAYS.map((_, day) => s.businessHours?.find((h) => h.day === day) ?? null));
  const domains = useApi<Domains>(can(store, 'domains.manage') ? '/store/domains' : null);
  const [newDomain, setNewDomain] = useState('');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const nul = (k: string) => f[k] || null;
    try {
      await apiFetch('/store/branding', { method: 'PATCH', body: {
        tagline: nul('tagline'), heroHeadline: nul('heroHeadline'), about: nul('about'), logoUrl: nul('logoUrl'), heroImageUrl: nul('heroImageUrl'), whatsappNumber: nul('whatsappNumber'),
        footerText: nul('footerText'), seoTitle: nul('seoTitle'), seoDescription: nul('seoDescription'), invoiceTerms: nul('invoiceTerms'),
        primaryColor: color, accentColor: f.accentColor, fontPreset: f.fontPreset,
        businessHours: hours.flatMap((h, day) => (h ? [{ ...h, day }] : [])),
      } });
      toast('Branding saved');
      setError('');
      reload();
    } catch (err) { setError(errorText(err)); }
  }
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); void domains.reload(); reload(); } catch (e) { toast(errorText(e), 'error'); } };
  const siteUrl = `http://${domains.data?.platformHostname ?? `${store.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'mcvc.localhost'}`}:3000`;

  return (
    <>
      <PageHeader title="Website & branding" subtitle={<>Your website is <StatusBadge status={store.websiteStatus} /> · <a className="text-brand" href={siteUrl} target="_blank" rel="noreferrer">{siteUrl.replace('http://', '')}</a></>} actions={
        can(store, 'website.publish') && (store.websiteStatus === 'PUBLISHED'
          ? <Button variant="secondary" onClick={() => run(() => apiFetch('/store/website/unpublish', { method: 'POST' }), 'Website unpublished')}>Unpublish</Button>
          : <Button onClick={() => run(() => apiFetch('/store/website/publish', { method: 'POST' }), 'Website published')}>Publish website</Button>)
      } />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <form onSubmit={save} className="space-y-6">
          {error && <Alert>{error}</Alert>}
          <Card title="Brand"><div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Tagline"><Input name="tagline" defaultValue={s.tagline ?? ''} /></Field>
            <Field label="Homepage headline"><Input name="heroHeadline" defaultValue={s.heroHeadline ?? ''} /></Field>
            <Field label="Logo URL"><Input name="logoUrl" type="url" defaultValue={s.logoUrl ?? ''} /></Field>
            <Field label="Hero image URL"><Input name="heroImageUrl" type="url" defaultValue={s.heroImageUrl ?? ''} /></Field>
            <Field label="Brand colour"><div className="flex gap-2"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded-lg border border-slate-200" aria-label="Brand colour" /><Input value={color} onChange={(e) => setColor(e.target.value)} /></div></Field>
            <Field label="Accent colour"><Input name="accentColor" defaultValue={s.accentColor ?? '#172B4D'} /></Field>
            <Field label="Typography"><Select name="fontPreset" defaultValue={s.fontPreset ?? 'inter'}><option value="inter">Inter (clean)</option><option value="geist">Geist (technical)</option><option value="poppins">Poppins (friendly)</option><option value="serif">Serif (classic)</option></Select></Field>
            <Field label="WhatsApp number"><Input name="whatsappNumber" defaultValue={s.whatsappNumber ?? ''} /></Field>
            <Field label="About the store" className="sm:col-span-2"><Textarea name="about" rows={4} defaultValue={s.about ?? ''} /></Field>
            <Field label="Footer text" className="sm:col-span-2"><Input name="footerText" defaultValue={s.footerText ?? ''} /></Field>
          </div></Card>
          <Card title="Business hours"><div className="space-y-2 p-5">
            {DAYS.map((d, i) => (
              <div key={d} className="flex items-center gap-3 text-sm">
                <label className="flex w-20 items-center gap-2"><input type="checkbox" checked={!!hours[i]} onChange={(e) => setHours(hours.map((h, j) => (j === i ? (e.target.checked ? { day: i, open: '10:00', close: '20:00' } : null) : h)))} /> {d}</label>
                {hours[i] ? <><Input type="time" value={hours[i]!.open} onChange={(e) => setHours(hours.map((h, j) => (j === i ? { ...h!, open: e.target.value } : h)))} className="w-32" /> – <Input type="time" value={hours[i]!.close} onChange={(e) => setHours(hours.map((h, j) => (j === i ? { ...h!, close: e.target.value } : h)))} className="w-32" /></> : <span className="text-slate-400">Closed</span>}
              </div>
            ))}
          </div></Card>
          <Card title="SEO & invoices"><div className="grid gap-4 p-5">
            <Field label="SEO title"><Input name="seoTitle" maxLength={70} defaultValue={s.seoTitle ?? ''} /></Field>
            <Field label="SEO description"><Input name="seoDescription" maxLength={160} defaultValue={s.seoDescription ?? ''} /></Field>
            <Field label="Invoice terms & conditions"><Textarea name="invoiceTerms" defaultValue={s.invoiceTerms ?? ''} /></Field>
          </div></Card>
          <Button size="lg">Save changes</Button>
        </form>

        <div className="space-y-6">
          <Card title="Preview">
            <div className="overflow-hidden rounded-b-2xl">
              <div className="flex items-center justify-between px-4 py-3" style={{ background: '#fff' }}><span className="font-bold" style={{ color: color }}>{store.name}</span><span className="rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ background: color }}>Book a service</span></div>
              <div className="px-4 py-8 text-white" style={{ background: `linear-gradient(120deg, #0a1630, ${color})` }}><p className="text-lg font-bold">{s.heroHeadline || store.name}</p><p className="text-sm opacity-80">{s.tagline}</p></div>
            </div>
          </Card>
          {domains.data && (
            <Card title="Domains">
              <div className="space-y-4 p-4 text-sm">
                <div className="flex items-center justify-between"><span className="font-mono text-xs">{domains.data.platformHostname}</span><Badge tone="green">Platform</Badge></div>
                {domains.data.domains.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{d.hostname}</span><span className="flex gap-1">{d.isPrimary && <Badge tone="blue">Primary</Badge>}<StatusBadge status={d.verificationStatus} /></span></div>
                    {d.verificationStatus !== 'VERIFIED' && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="text-slate-500">Add these DNS records at your registrar, then verify:</p>
                        {d.instructions.map((r) => <p key={r.type} className="break-all rounded bg-slate-50 p-2 font-mono">{r.type} {r.name} → {r.value}</p>)}
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      {d.verificationStatus !== 'VERIFIED' && <Button size="sm" onClick={() => run(() => apiFetch(`/store/domains/${d.id}/verify`, { method: 'POST' }), 'Verification checked')}>Verify</Button>}
                      {d.verificationStatus === 'VERIFIED' && !d.isPrimary && <Button size="sm" variant="secondary" onClick={() => run(() => apiFetch(`/store/domains/${d.id}/primary`, { method: 'POST' }), 'Primary domain set')}>Make primary</Button>}
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Disconnect ${d.hostname}?`) && run(() => apiFetch(`/store/domains/${d.id}`, { method: 'DELETE' }), 'Domain removed')}>Remove</Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2"><Input placeholder="yourstore.in" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} /><Button variant="secondary" disabled={!newDomain} onClick={() => run(() => apiFetch('/store/domains', { method: 'POST', body: { hostname: newDomain } }).then(() => setNewDomain('')), 'Domain added')}>Connect</Button></div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
