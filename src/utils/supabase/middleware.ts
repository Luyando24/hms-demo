import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/seed')
  ) {
    // no user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // RBAC route protection for authenticated users
  if (user && request.nextUrl.pathname.startsWith('/hospital/')) {
    const userRole = user.user_metadata?.role || 'STAFF';
    const rolePermissions: Record<string, string[]> = {
      ADMIN: [
        '/hospital/dashboard', '/hospital/reception', '/hospital/patients', '/hospital/er',
        '/hospital/ipd', '/hospital/opd', '/hospital/icu', '/hospital/radiology',
        '/hospital/laboratory', '/hospital/inventory', '/hospital/bloodbank', '/hospital/billing',
        '/hospital/staff', '/hospital/admin/departments', '/hospital/admin/rooms', '/hospital/hr', '/hospital/reports'
      ],
      DOCTOR: [
        '/hospital/dashboard', '/hospital/patients', '/hospital/er', '/hospital/ipd',
        '/hospital/opd', '/hospital/icu', '/hospital/radiology', '/hospital/laboratory', '/hospital/inventory'
      ],
      NURSE: [
        '/hospital/dashboard', '/hospital/reception', '/hospital/patients', '/hospital/er',
        '/hospital/ipd', '/hospital/opd', '/hospital/icu', '/hospital/laboratory', '/hospital/inventory', '/hospital/bloodbank'
      ],
      PHARMACIST: [
        '/hospital/dashboard', '/hospital/patients', '/hospital/inventory'
      ],
      LAB_TECH: [
        '/hospital/dashboard', '/hospital/patients', '/hospital/laboratory'
      ],
      RADIOLOGIST: [
        '/hospital/dashboard', '/hospital/patients', '/hospital/radiology'
      ],
      ACCOUNTANT: [
        '/hospital/dashboard', '/hospital/reception', '/hospital/patients', '/hospital/billing', '/hospital/reports'
      ],
      RECEPTIONIST: [
        '/hospital/dashboard', '/hospital/reception', '/hospital/patients', '/hospital/billing'
      ],
      STAFF: [
        '/hospital/dashboard', '/hospital/patients'
      ]
    };

    const allowedRoutes = rolePermissions[userRole.toUpperCase()] || rolePermissions['ADMIN'];
    const currentPath = request.nextUrl.pathname;

    // Check if path is in allowed routes
    const isAllowed = allowedRoutes.some(route => currentPath === route || currentPath.startsWith(route + '/'));

    if (!isAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/hospital/dashboard';
      return NextResponse.redirect(url);
    }
  }


  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally: return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
