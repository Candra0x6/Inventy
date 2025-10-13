import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware specifically for logout handling to prevent session recreation
 */
export async function logoutMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // If this is a logout request, ensure no session cookies are set in response
  if (pathname === '/auth/logout' || pathname.includes('/api/auth/logout')) {
    const response = NextResponse.next()
    
    // Clear all NextAuth cookies immediately
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      'next-auth.pkce.code_verifier'
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
    })

    return response
  }

  return NextResponse.next()
}

/**
 * Check if the current request is coming from a freshly logged out session
 * This helps prevent immediate session recreation
 */
export function isLogoutRedirect(request: NextRequest): boolean {
  const referer = request.headers.get('referer')
  
  // Check if coming from logout page or logout API
  if (referer && (referer.includes('/auth/logout') || referer.includes('/api/auth/logout'))) {
    return true
  }

  // Check if there's a logout flag in the URL or headers
  const url = new URL(request.url)
  if (url.searchParams.has('logout') || url.searchParams.has('signed-out')) {
    return true
  }

  return false
}
