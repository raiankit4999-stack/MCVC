const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Server-side fetch to the API for public pages. `host` selects a store website. */
export async function api<T>(path: string, opts: { host?: string; revalidate?: number } = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: opts.host ? { 'X-Store-Host': opts.host } : {},
    next: { revalidate: opts.revalidate ?? 30 },
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export async function apiOrNull<T>(path: string, opts: { host?: string; revalidate?: number } = {}): Promise<T | null> {
  try {
    return await api<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
