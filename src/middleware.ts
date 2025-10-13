import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'
import { logoutMiddleware, isLogoutRedirect } from '@/lib/auth/logout-middleware'

// Helper function to clean duplicate NextAuth cookies in middleware
function cleanupDuplicateCookies(request: NextRequest, response: NextResponse) {
  const cookies = request.cookies
  const sessionTokens = []
  const allNextAuthCookies = new Set<string>()
  
  // Find all NextAuth-related cookies
  for (const [name, value] of cookies) {
    if (name.includes('next-auth')) {
      allNextAuthCookies.add(name)
      if (name === 'next-auth.session-token') {
        sessionTokens.push(value.value)
      }
    }
  }
  
  // If there are multiple session tokens, clear all and keep only the last one
  if (sessionTokens.length > 1) {
    console.log(`Found ${sessionTokens.length} duplicate session tokens, cleaning up...`)
    
    // Clear all session tokens
    response.cookies.delete('next-auth.session-token')
    
    // Set only the most recent one
    if (sessionTokens.length > 0) {
      response.cookies.set('next-auth.session-token', sessionTokens[sessionTokens.length - 1], {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      })
    }
  }
  
  // Clean up any orphaned NextAuth cookies
  const validCookieNames = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token'
  ]
  
  allNextAuthCookies.forEach(cookieName => {
    if (!validCookieNames.includes(cookieName)) {
      console.log(`Cleaning up orphaned cookie: ${cookieName}`)
      response.cookies.delete(cookieName)
    }
  })
  
  return response
}

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  '/dashboard': ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'],
  '/profile': ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'],
  '/admin': ['SUPER_ADMIN'],
  '/users': ['SUPER_ADMIN', 'MANAGER'],
  '/items/add': ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
  '/items/edit': ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
  '/reservations/approve': ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
  '/analytics': ['SUPER_ADMIN', 'MANAGER'],
  '/organizations': ['SUPER_ADMIN'],
  '/departments': ['SUPER_ADMIN', 'MANAGER'],
  '/audit': ['SUPER_ADMIN'],
} as const

type ProtectedRoute = keyof typeof PROTECTED_ROUTES

function isProtectedRoute(pathname: string): pathname is ProtectedRoute {
  return Object.keys(PROTECTED_ROUTES).some(route => 
    pathname.startsWith(route)
  )
}

function getRequiredRoles(pathname: string): readonly UserRole[] | null {
  const route = Object.keys(PROTECTED_ROUTES).find(route => 
    pathname.startsWith(route)
  ) as ProtectedRoute | undefined
  
  return route ? PROTECTED_ROUTES[route] : null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Handle logout-specific middleware first
  if (pathname === '/auth/logout' || pathname.includes('/api/auth/logout')) {
    return logoutMiddleware(request)
  }

  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if this is a logout redirect and prevent session recreation
  if (isLogoutRedirect(request)) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('message', 'signed-out')
    return NextResponse.redirect(loginUrl)
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if route requires specific roles
  if (isProtectedRoute(pathname)) {
    const requiredRoles = getRequiredRoles(pathname)
    
    if (requiredRoles && !requiredRoles.includes(token.role as UserRole)) {
      // Redirect to unauthorized page or dashboard based on role
      const unauthorizedUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(unauthorizedUrl)
    }
  }

  // Add user info to headers for use in API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', token.sub!)
  requestHeaders.set('x-user-role', token.role as string)
  if (token.organizationId) {
    requestHeaders.set('x-user-organization', token.organizationId as string)
  }
  if (token.departmentId) {
    requestHeaders.set('x-user-department', token.departmentId as string)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Clean up any duplicate cookies before returning
  return cleanupDuplicateCookies(request, response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
