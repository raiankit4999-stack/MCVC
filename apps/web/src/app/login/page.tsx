'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/site-chrome';
import { Alert, Button, Field, Input } from '@/components/ui';
import { apiFetch, errorText, setStoreId } from '@/lib/client-api';

interface Me { platformRole: string | null; memberships: { id: string }[] }
interface DemoAccounts { enabled: boolean; password?: string; accounts: { email: string; label: string; description: string }[] }

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | false>(false);
  const [demo, setDemo] = useState<DemoAccounts | null>(null);
  useEffect(() => { void apiFetch<DemoAccounts>('/auth/demo-accounts', { store: false }).then(setDemo).catch(() => setDemo(null)); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await signIn(String(f.get('login')), String(f.get('password')), 'form');
  }

  async function signIn(login: string, password: string, who: string) {
    setBusy(who);
    setError('');
    try {
      await apiFetch('/auth/login', { method: 'POST', body: { login, password }, store: false });
      const me = await apiFetch<Me>('/auth/me', { store: false });
      if (me.memberships[0]) setStoreId(me.memberships[0].id);
      router.push(next ?? (me.platformRole ? '/admin' : me.memberships.length ? '/erp' : '/join'));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email or phone"><Input name="login" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Button className="h-12 w-full text-base sm:h-10 sm:text-sm" disabled={!!busy}>{busy === 'form' ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      {demo?.enabled && demo.password && (
        <section className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-4" aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-sm font-semibold text-slate-900">Demo accounts</h2>
          <p className="mt-0.5 text-xs text-slate-600">Tap a role to sign in. Password for all: <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-brand-700 ring-1 ring-brand-100">{demo.password}</code></p>
          <ul className="mt-3 space-y-2">
            {demo.accounts.map((a) => (
              <li key={a.email}>
                <button type="button" disabled={!!busy} onClick={() => signIn(a.email, demo.password!, a.email)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:ring-brand-100 active:scale-[.99] disabled:opacity-60">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{a.label}</span>
                    <span className="block truncate text-xs text-slate-500">{a.email}</span>
                    <span className="block text-xs text-slate-500">{a.description}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">{busy === a.email ? '…' : 'Sign in'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-2">
      <div className="hero-bg hidden flex-col justify-between p-12 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="text-3xl font-bold">One network. Independent businesses.</h2>
          <p className="mt-3 max-w-md text-slate-300">Your store dashboard, community admin and customer bookings — all in one place.</p>
        </div>
        <p className="text-xs text-slate-400">Each store&apos;s customers and financial data remain private to that store.</p>
      </div>
      <div className="flex items-start justify-center p-5 sm:items-center sm:p-6">
        <div className="w-full max-w-sm py-6">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 text-2xl font-bold text-ink">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Store owners, staff and community administrators.</p>
          <Suspense><LoginForm /></Suspense>
          <p className="mt-6 text-center text-sm text-slate-500">New business? <Link href="/join" className="font-semibold text-brand">Become a member</Link></p>
        </div>
      </div>
    </div>
  );
}
