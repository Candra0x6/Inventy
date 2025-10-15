import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get the current token to verify user is authenticated
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create response
    const response = NextResponse.json({ 
      success: true, 
      message: 'Successfully logged out' 
    })

    // Clear all NextAuth cookies with correct attributes
    const isProduction = process.env.NODE_ENV === 'production'
    
    // In production, NextAuth uses __Secure- prefix for secure cookies
    const sessionTokenName = isProduction ? '' : ''
    const csrfTokenName = isProduction ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token'
    
    const cookiesToClear = [
      "__Secure-next-auth.session-token",
      "next-auth.session-token",
      'next-auth.callback-url',
      'next-auth.pkce.code_verifier',
      // Also clear the non-prefixed versions just in case
      'next-auth.session-token',
      'next-auth.csrf-token',
    ]

    // Clear cookies with EXACT same attributes they were set with
    cookiesToClear.forEach(cookieName => {
      // Primary deletion with correct httpOnly flag
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true, // Must match the httpOnly setting in auth.ts
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 0,
        domain: undefined, // Avoid domain issues by not setting it
      })
    })

    // Also use Set-Cookie headers for more aggressive clearing
    // Use correct cookie names with prefixes in production
    response.headers.append(
      'Set-Cookie', 
      `${sessionTokenName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}`
    )
    response.headers.append(
      'Set-Cookie', 
      `${csrfTokenName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax${isProduction ? '; Secure' : ''}`
    )
    response.headers.append(
      'Set-Cookie', 
      `next-auth.callback-url=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax${isProduction ? '; Secure' : ''}`
    )

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during logout' 
    }, { status: 500 })
  }
}
