import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configError = !url || !anonKey || !import.meta.env.VITE_API_URL
  ? 'Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_API_URL. See frontend/.env.example.'
  : null;

// The browser uses Supabase ONLY to log in and out. All store data goes through the Express API.
export const supabase = configError ? null : createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
