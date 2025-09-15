import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  '/dashboard': ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'],
  '/profile': ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'],
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
  
  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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
