'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Logo } from '@/components/site-chrome';
import { Alert, Button, Field, Input } from '@/components/ui';
import { apiFetch, errorText, setStoreId } from '@/lib/client-api';

interface Me { platformRole: string | null; memberships: { id: string }[] }

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await apiFetch('/auth/login', { method: 'POST', body: { login: f.get('login'), password: f.get('password') }, store: false });
      const me = await apiFetch<Me>('/auth/me', { store: false });
      if (me.memberships[0]) setStoreId(me.memberships[0].id);
      router.push(next ?? (me.platformRole ? '/admin' : me.memberships.length ? '/erp' : '/join'));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Email or phone"><Input name="login" autoComplete="username" required autoFocus /></Field>
      <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
      <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-bg hidden flex-col justify-between p-12 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="text-3xl font-bold">One network. Independent businesses.</h2>
          <p className="mt-3 max-w-md text-slate-300">Your store dashboard, community admin and customer bookings — all in one place.</p>
        </div>
        <p className="text-xs text-slate-400">Each store&apos;s customers and financial data remain private to that store.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
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
