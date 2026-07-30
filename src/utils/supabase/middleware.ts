import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSubdomain, getSubdomainUrl, getRootDomain } from '@/utils/subdomain'
import { isRouteAllowedForRole } from '@/utils/rbac'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const envRoot = getRootDomain()
  const rootDomainHost = envRoot.split(':')[0]

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options }
            if (rootDomainHost !== 'localhost' && !rootDomainHost.includes('127.0.0.1')) {
              cookieOptions.domain = `.${rootDomainHost}`
            }
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options }
            if (rootDomainHost !== 'localhost' && !rootDomainHost.includes('127.0.0.1')) {
              cookieOptions.domain = `.${rootDomainHost}`
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  const host = request.headers.get('host')
  const subdomain = getSubdomain(host)
  const pathname = request.nextUrl.pathname

  const helperResponse = (res: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie)
    })
    return res
  }

  // 1. Fetch user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute =
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/seed')

  // Unauthenticated user flow
  if (!user) {
    if (!isPublicRoute && pathname !== '/') {
      const loginUrl = getSubdomainUrl(subdomain, '/login')
      return helperResponse(NextResponse.redirect(loginUrl))
    }

    // Root path rewrites for unauthenticated subdomain landing
    if (subdomain === 'patient' && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return helperResponse(NextResponse.rewrite(url))
    }

    if ((subdomain === 'staff' || subdomain === 'admin') && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return helperResponse(NextResponse.rewrite(url))
    }

    return supabaseResponse
  }

  // 2. Fetch authenticated user role
  let userRole = user.user_metadata?.role
  if (!userRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role || 'STAFF'
  }
  userRole = userRole.toUpperCase()

  // 3. Subdomain enforcement & URL rewriting for authenticated users

  // A. PATIENT Subdomain
  if (subdomain === 'patient') {
    if (userRole !== 'PATIENT') {
      const targetSubdomain = userRole === 'ADMIN' ? 'admin' : 'staff'
      const redirectUrl = getSubdomainUrl(targetSubdomain, '/hospital/dashboard')
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      url.pathname = '/patient/portal'
      return helperResponse(NextResponse.rewrite(url))
    }

    if (!pathname.startsWith('/patient/') && !isPublicRoute) {
      if (pathname.startsWith('/portal')) {
        url.pathname = `/patient${pathname}`
      } else {
        url.pathname = `/patient/portal${pathname}`
      }
      return helperResponse(NextResponse.rewrite(url))
    }

    return supabaseResponse
  }

  // B. STAFF Subdomain
  if (subdomain === 'staff') {
    if (userRole === 'PATIENT') {
      const redirectUrl = getSubdomainUrl('patient', '/patient/portal')
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    // Check if non-admin staff attempts to access admin-only path
    const isAdminOnlyRoute =
      pathname.includes('/admin/') ||
      pathname.endsWith('/admin') ||
      pathname.includes('/hr') ||
      pathname.includes('/staff')

    if (isAdminOnlyRoute && userRole !== 'ADMIN') {
      const adminRedirectUrl = getSubdomainUrl('admin', pathname)
      return helperResponse(NextResponse.redirect(adminRedirectUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      url.pathname = '/hospital/dashboard'
      return helperResponse(NextResponse.rewrite(url))
    }

    if (!pathname.startsWith('/hospital/') && !isPublicRoute) {
      url.pathname = `/hospital${pathname}`
      return helperResponse(NextResponse.rewrite(url))
    }

    const effectivePath = url.pathname
    if (!isRouteAllowedForRole(userRole, effectivePath)) {
      url.pathname = '/hospital/dashboard'
      return helperResponse(NextResponse.redirect(url))
    }

    return supabaseResponse
  }

  // C. ADMIN Subdomain
  if (subdomain === 'admin') {
    if (userRole === 'PATIENT') {
      const redirectUrl = getSubdomainUrl('patient', '/patient/portal')
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    if (userRole !== 'ADMIN') {
      const redirectUrl = getSubdomainUrl('staff', '/hospital/dashboard')
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      url.pathname = '/hospital/dashboard'
      return helperResponse(NextResponse.rewrite(url))
    }

    if (!pathname.startsWith('/hospital/') && !isPublicRoute) {
      url.pathname = `/hospital${pathname}`
      return helperResponse(NextResponse.rewrite(url))
    }

    return supabaseResponse
  }

  // D. ROOT Domain (No subdomain)
  if (!subdomain && user) {
    if (pathname === '/' || pathname === '/hospital' || pathname === '/patient') {
      let targetSubdomain: 'patient' | 'staff' | 'admin' = 'staff'
      let targetPath = '/hospital/dashboard'

      if (userRole === 'PATIENT') {
        targetSubdomain = 'patient'
        targetPath = '/patient/portal'
      } else if (userRole === 'ADMIN') {
        targetSubdomain = 'admin'
        targetPath = '/hospital/dashboard'
      }

      const targetUrl = getSubdomainUrl(targetSubdomain, targetPath)
      return helperResponse(NextResponse.redirect(targetUrl))
    }
  }

  return supabaseResponse
}
