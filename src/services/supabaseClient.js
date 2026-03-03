import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const isPlaceholder = (val) =>
  !val || val.includes('your-project-id') || val.includes('your-anon-key');

export const isSupabaseConfigured = () =>
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseAnonKey);

if (!isSupabaseConfigured()) {
  console.error(
    'Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const handleSupabaseResult = ({ data, error }) => {
  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message || 'Supabase request failed');
  }
  return data;
};

/**
 * Test if Supabase servers are reachable (network/CORS/config check).
 * Call this to diagnose "Failed to fetch" errors.
 * @returns {{ reachable: boolean; hint?: string }}
 */
export async function checkSupabaseReachability() {
  if (!isSupabaseConfigured()) {
    return { reachable: false, hint: 'Supabase URL/key not set in .env. Restart dev server after adding them.' };
  }
  try {
    // Supabase REST endpoint; even 400/401 means we reached the server
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { Accept: 'application/json', apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(8000),
    });
    // Any HTTP response = reachable
    return { reachable: true };
  } catch (err) {
    const msg = err?.message || '';
    let hint = 'Check: 1) Restart dev server after changing .env. 2) Supabase project may be paused (Dashboard → Restore). 3) Firewall/VPN/ad blocker. 4) Try incognito or different browser.';
    if (msg.includes('fetch') || err?.name === 'TypeError') {
      return { reachable: false, hint };
    }
    return { reachable: false, hint: msg };
  }
}
