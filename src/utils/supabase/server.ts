import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'
import { getRootDomain } from '@/utils/subdomain'

export async function createClient() {
  const cookieStore = await cookies()
  const envRoot = getRootDomain()
  const rootDomainHost = envRoot.split(':')[0]

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                maxAge: 60 * 60 * 24 * 365, // 1 year persistent session
                sameSite: 'lax' as const,
                path: '/',
              }
              if (rootDomainHost !== 'localhost' && !rootDomainHost.includes('127.0.0.1')) {
                cookieOptions.domain = `.${rootDomainHost}`
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
