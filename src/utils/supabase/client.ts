import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let clientSideSupabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (typeof window !== 'undefined' && clientSideSupabaseInstance) {
    return clientSideSupabaseInstance;
  }

  const envRoot = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const rootDomainHost = envRoot.split(':')[0];
  const domain = (rootDomainHost !== 'localhost' && !rootDomainHost.includes('127.0.0.1'))
    ? `.${rootDomainHost}`
    : undefined;

  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 365, // 1 year persistent session
        sameSite: 'lax',
        path: '/',
        domain,
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
