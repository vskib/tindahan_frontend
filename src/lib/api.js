import { supabase } from './supabase.js';

export class ApiError extends Error {
  constructor(status, code, message, fields = []) {
    super(message);
    this.status = status;     // 0 = could not reach the server (or timed out)
    this.code = code;
    this.fields = fields;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const TIMEOUT_MS = 20_000;

export async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = { Accept: 'application/json' };
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, signal: ctrl.signal, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check the internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    const e = json?.error ?? {};
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Something went wrong. Please try again.', e.fields ?? []);
  }
  return json;
}
