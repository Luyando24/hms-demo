import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { getAuthCookieDomain } from '@/utils/subdomain'

let clientSideSupabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (typeof window !== 'undefined' && clientSideSupabaseInstance) {
    return clientSideSupabaseInstance;
  }

  const host = typeof window !== 'undefined' ? window.location.host : null;
  const authCookieDomain = getAuthCookieDomain(host);

  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 365, // 1 year persistent session
        sameSite: 'lax',
        path: '/',
        ...(authCookieDomain ? { domain: authCookieDomain } : {}),
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  if (typeof window !== 'undefined') {
    clientSideSupabaseInstance = client;
  }

  return client;
}
