import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSubdomain, getSubdomainUrl, getRootDomain } from '@/utils/subdomain'
import { getRoleLandingDestination, isRouteAllowedForRole } from '@/utils/rbac'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const envRoot = getRootDomain()
  const rootDomainHost = envRoot.split(':')[0]

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
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
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
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
      res.cookies.set(cookie.name, cookie.value, {
        ...cookie,
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        path: '/',
      })
    })
    return res
  }

  // 1. Fetch user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginChooserRoute = pathname === '/login'
  const isStaffLoginRoute = pathname === '/login/staff' || pathname === '/staff/login'
  const isAdminLoginRoute = pathname === '/login/admin' || pathname === '/admin/login'
  const isWorkforceLoginRoute =
    isLoginChooserRoute || isStaffLoginRoute || isAdminLoginRoute
  const isPatientLoginRoute = pathname === '/patient/login'
  const isPwaAssetRoute =
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname.startsWith('/icons/') ||
    /^\/swe-worker-.+\.js$/.test(pathname)
  const isPublicRoute =
    isWorkforceLoginRoute ||
    isPatientLoginRoute ||
    isPwaAssetRoute ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/book-appointment') ||
    pathname.startsWith('/tv')

  // Unauthenticated user flow
  if (!user) {
    if (subdomain === 'patient' && isWorkforceLoginRoute) {
      return helperResponse(
        NextResponse.redirect(getSubdomainUrl('patient', '/patient/login')),
      )
    }

    if ((subdomain === 'staff' || subdomain === 'admin') && isPatientLoginRoute) {
      return helperResponse(
        NextResponse.redirect(getSubdomainUrl(subdomain, '/login')),
      )
    }

    if (!isPublicRoute && pathname !== '/') {
      const isPatientRequest =
        subdomain === 'patient' || (!subdomain && pathname.startsWith('/patient'))
      const loginUrl = getSubdomainUrl(
        subdomain,
        isPatientRequest ? '/patient/login' : '/login',
      )
      return helperResponse(NextResponse.redirect(loginUrl))
    }

    // Root path rewrites for unauthenticated subdomain landing
    if (subdomain === 'patient' && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/patient/login'
      return helperResponse(NextResponse.rewrite(url))
    }

    if ((subdomain === 'staff' || subdomain === 'admin') && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return helperResponse(NextResponse.rewrite(url))
    }

    return supabaseResponse
  }

  // 2. Authorization from profile with safe fallback to metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const userRole =
    profile?.role?.toUpperCase() ||
    (user.user_metadata?.role ? String(user.user_metadata.role).toUpperCase() : null) ||
    (user.app_metadata?.role ? String(user.app_metadata.role).toUpperCase() : null)

  const landingDestination = userRole ? getRoleLandingDestination(userRole) : null
  if (!userRole || !landingDestination) {
    const loginPath = subdomain === 'patient' || (!subdomain && pathname.startsWith('/patient'))
      ? '/patient/login?error=Invalid%20account%20profile'
      : '/login?error=Invalid%20account%20profile'
    const loginUrl = getSubdomainUrl(subdomain, loginPath)
    return helperResponse(NextResponse.redirect(loginUrl))
  }

  if (isWorkforceLoginRoute || isPatientLoginRoute) {
    return helperResponse(
      NextResponse.redirect(
        getSubdomainUrl(landingDestination.subdomain, landingDestination.path),
      ),
    )
  }

  if (pathname.startsWith('/seed')) {
    return helperResponse(
      NextResponse.redirect(
        getSubdomainUrl(landingDestination.subdomain, landingDestination.path),
      ),
    )
  }

  // 3. Subdomain enforcement & URL rewriting for authenticated users

  // A. PATIENT Subdomain
  if (subdomain === 'patient') {
    if (userRole !== 'PATIENT') {
      const redirectUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      url.pathname = landingDestination.path
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
      const redirectUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    // Check if non-admin staff attempts to access admin-only path
    const isAdminOnlyRoute =
      pathname.includes('/admin/') ||
      pathname.endsWith('/admin') ||
      pathname.includes('/hr') ||
      pathname.includes('/staff')

    if (isAdminOnlyRoute && userRole !== 'ADMIN') {
      const defaultUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(defaultUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      if (landingDestination.subdomain !== 'staff') {
        return helperResponse(
          NextResponse.redirect(
            getSubdomainUrl(landingDestination.subdomain, landingDestination.path),
          ),
        )
      }
      url.pathname = landingDestination.path
      return helperResponse(NextResponse.rewrite(url))
    }

    if (!pathname.startsWith('/hospital/') && !isPublicRoute) {
      url.pathname = `/hospital${pathname}`
      return helperResponse(NextResponse.rewrite(url))
    }

    const effectivePath = url.pathname
    if (!isRouteAllowedForRole(userRole, effectivePath)) {
      return helperResponse(
        NextResponse.redirect(
          getSubdomainUrl(landingDestination.subdomain, landingDestination.path),
        ),
      )
    }

    return supabaseResponse
  }

  // C. ADMIN Subdomain
  if (subdomain === 'admin') {
    if (userRole === 'PATIENT') {
      const redirectUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    if (userRole !== 'ADMIN') {
      const redirectUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(redirectUrl))
    }

    const url = request.nextUrl.clone()
    if (pathname === '/' || pathname === '') {
      url.pathname = landingDestination.path
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
      const targetUrl = getSubdomainUrl(
        landingDestination.subdomain,
        landingDestination.path,
      )
      return helperResponse(NextResponse.redirect(targetUrl))
    }
  }

  return supabaseResponse
}
