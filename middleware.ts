import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasActiveSubscription } from './lib/check-subscription'

export async function middleware(request: NextRequest) {
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

  // Check if in development bypass mode
  const isDevelopmentBypass = process.env.NODE_ENV === 'development' && 
                              process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  // Debug logging (remove after testing)
  if (process.env.NODE_ENV === 'development') {
    console.log('Dev bypass enabled:', isDevelopmentBypass, 'Path:', request.nextUrl.pathname)
  }

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes (require subscription)
  const protectedRoutes = ['/homezone', '/profile', '/appengine', '/analyses', '/billing']
  const authRoutes = ['/login', '/signup']
  const adminRoutes = ['/admin']
  const publicRoutes = ['/pricing', '/onboarding', '/', '/contact', '/terms-of-service', '/privacy-policy', '/affiliate']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isAdminRoute = adminRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  )

  // Skip auth checks in development bypass mode
  if (isDevelopmentBypass) {
    console.log('✅ Bypassing auth for development')
    return supabaseResponse
  }

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check subscription status for protected routes (user must be authenticated at this point)
  if (isProtectedRoute && user && !isAdminRoute) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const hasSubscription = await hasActiveSubscription(
        user.id,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        user.email
      )
      
      if (!hasSubscription) {
        // No active subscription - redirect to pricing
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/pricing'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const hasSubscription = await hasActiveSubscription(
        user.id,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        user.email
      )
      
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = hasSubscription ? '/homezone' : '/pricing'
      return NextResponse.redirect(redirectUrl)
    } else {
      // Fallback to pricing if we can't check subscription
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/pricing'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Check admin access for admin routes
  if (isAdminRoute && !isDevelopmentBypass) {
    if (!user) {
      // Not logged in - redirect to login
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Check if user is an admin using service role to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      // Service role key not available - block admin access
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/homezone'
      return NextResponse.redirect(redirectUrl)
    }
    
    // Create admin client with service role (bypasses RLS)
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!adminData || adminError) {
      // Not an admin - redirect to homezone
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/homezone'
      return NextResponse.redirect(redirectUrl)
    }
    
    // User is admin - allow access (don't need to do anything, just continue)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

