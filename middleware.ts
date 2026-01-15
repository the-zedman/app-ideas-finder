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

  // MAINTENANCE MODE: Block all public access, allow only authenticated admins
  // Skip maintenance check for maintenance page itself and static assets
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance'
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next/') || 
                       request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/i)
  
  if (!isMaintenancePage && !isStaticAsset) {
    // Check if user is an admin
    let isAdmin = false
    if (user) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        try {
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
          
          const { data: adminData } = await supabaseAdmin
            .from('admins')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()
          
          isAdmin = !!adminData
        } catch (error) {
          console.error('[middleware] Error checking admin status:', error)
        }
      }
    }

    // Allow access only for admins or in development bypass mode
    if (!isAdmin && !isDevelopmentBypass) {
      // Redirect all non-admin requests to maintenance page
      const maintenanceUrl = request.nextUrl.clone()
      maintenanceUrl.pathname = '/maintenance'
      return NextResponse.redirect(maintenanceUrl)
    }
  }

  // Protected routes (require subscription)
  const protectedRoutes = ['/homezone', '/profile', '/appengine', '/analyses', '/billing', '/feedback']
  const authRoutes = ['/login', '/signup']
  const adminRoutes = ['/admin']
  const publicRoutes = ['/pricing', '/onboarding', '/', '/contact', '/terms-of-service', '/privacy-policy', '/gallery']
  
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
  // Allow access to /homezone even without subscription - let the page handle the UI
  if (isProtectedRoute && user && !isAdminRoute && request.nextUrl.pathname !== '/homezone') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const hasSubscription = await hasActiveSubscription(
        user.id,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        user.email
      )
      
      if (!hasSubscription) {
        // No active subscription - redirect to pricing (except for /homezone)
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/pricing'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  // Redirect authenticated users away from auth routes (but allow if they're not admin - they'll be redirected to maintenance)
  if (isAuthRoute && user) {
    // Check if user is admin first
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let isAdmin = false
    
    if (serviceRoleKey) {
      try {
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
        
        const { data: adminData } = await supabaseAdmin
          .from('admins')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()
        
        isAdmin = !!adminData
      } catch (error) {
        console.error(`[middleware] Error checking admin status:`, error)
      }
    }
    
    // Only redirect admins away from auth pages (non-admins will be blocked by maintenance mode above)
    if (isAdmin) {
      try {
        const hasSubscription = await hasActiveSubscription(
          user.id,
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey!,
          user.email
        )
        
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/homezone'
        return NextResponse.redirect(redirectUrl)
      } catch (error) {
        console.error(`[middleware] Error checking subscription for ${user.id}:`, error)
      }
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

