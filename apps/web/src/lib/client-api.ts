'use client';

import { useCallback, useEffect, useState } from 'react';

const STORE_KEY = 'mcvc.storeId';

export function getStoreId(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}
export function setStoreId(id: string) {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* ignore */
  }
}

export class ClientApiError extends Error {
  constructor(public status: number, message: string, public issues?: { path: string; message: string }[]) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  refreshing ??= fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'x-mcvc-csrf': '1', 'content-type': 'application/json' }, body: '{}', credentials: 'include' })
    .then((r) => r.ok)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

/** Browser API call via the same-origin proxy. Cookie auth + CSRF header + selected store. */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown; store?: boolean; host?: string } = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'x-mcvc-csrf': '1' };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const storeId = init.store === false ? null : getStoreId();
  if (storeId) headers['x-store-id'] = storeId;
  if (init.host) headers['x-store-host'] = init.host;
  const res = await fetch(`/api/v1${path}`, { method: init.method ?? 'GET', headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, credentials: 'include' });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refresh()) return apiFetch<T>(path, init, false);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientApiError(res.status, Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Request failed', data.issues);
  return data as T;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await apiFetch<T>(path));
      setError(null);
    } catch (e) {
      setError(e as ClientApiError);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, reload: load, setData };
}

export function errorText(e: unknown): string {
  if (e instanceof ClientApiError) return e.issues?.length ? e.issues.map((i) => `${i.path}: ${i.message}`).join('; ') : e.message;
  return 'Something went wrong';
}
