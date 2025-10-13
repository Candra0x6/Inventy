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

    // Clear all NextAuth cookies aggressively
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token', 
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      'next-auth.pkce.code_verifier'
    ]

    // Clear cookies with multiple configurations to ensure complete removal
    cookiesToClear.forEach(cookieName => {
      // Clear with httpOnly
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0
      })

      // Clear without httpOnly
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0
      })

      // Clear for different paths
      const paths = ['/', '/auth', '/api', '/dashboard']
      paths.forEach(path => {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: path,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0
        })
      })
    })

    // Also add explicit Set-Cookie headers for more aggressive clearing
    cookiesToClear.forEach(cookieName => {
      response.headers.append('Set-Cookie', `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
      response.headers.append('Set-Cookie', `${cookieName}=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
      response.headers.append('Set-Cookie', `${cookieName}=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during logout' 
    }, { status: 500 })
  }
}
