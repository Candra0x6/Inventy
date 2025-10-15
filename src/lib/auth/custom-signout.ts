import { signOut as nextAuthSignOut } from "next-auth/react"

/**
 * Custom sign out function that ensures all cookies are properly cleaned up
 * for both credentials and OAuth authentication
 */
export const customSignOut = async (options?: { callbackUrl?: string }) => {
  try {
    // Call NextAuth signOut first without redirect to let it handle the session properly
    await nextAuthSignOut({
      redirect: false
    })

    // Wait a moment for NextAuth to process the signout
    await new Promise(resolve => setTimeout(resolve, 100))

    // Now aggressively clean all NextAuth cookies
    const cookiesToClean = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      'next-auth.pkce.code_verifier'
    ]

    // Client-side aggressive cookie cleanup
    if (typeof window !== 'undefined') {
      // Clear all NextAuth cookies multiple times with different configurations
      for (let i = 0; i < 3; i++) {
        cookiesToClean.forEach(cookieName => {
          // Clear with various domain and path combinations
          const clearConfigs = [
            { domain: '', path: '/' },
            { domain: 'localhost', path: '/' },
            { domain: '.localhost', path: '/' },
            { domain: '127.0.0.1', path: '/' },
            { domain: undefined, path: '/' },
            { domain: window.location.hostname.split('.').slice(-2).join('.'), path: '/' },
            { domain: `.${window.location.hostname.split('.').slice(-2).join('.')}`, path: '/' },
            { domain: window.location.hostname, path: '/' },
            { domain: '', path: '/auth' },
            { domain: '', path: '/api' }
          ]

          clearConfigs.forEach(config => {
            let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0; path=${config.path};`
            if (config.domain) {
              cookieString += ` domain=${config.domain};`
            }
            if (process.env.NODE_ENV === 'production') {
              cookieString += ' secure;'
            }
            cookieString += ' samesite=lax;'
            
            document.cookie = cookieString
          })
        })
        
        // Small delay between cleanup iterations
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Final aggressive cleanup - find and delete any remaining NextAuth cookies
      const allCookies = document.cookie.split(';')
      allCookies.forEach(cookie => {
        const name = cookie.split('=')[0].trim()
        if (name.includes('next-auth') || name.includes('__Secure-next-auth') || name.includes('__Host-next-auth')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0;`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; max-age=0;`
        }
      })

      // Call our custom logout API to ensure server-side cleanup
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.warn('Server-side logout cleanup failed:', error)
      }

      // Also call NextAuth's signout endpoint directly to ensure proper cleanup
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'csrfToken=',
          credentials: 'include'
        })
      } catch (error) {
        console.warn('NextAuth signout API call failed:', error)
      }

      // Final wait before redirect to ensure all cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Force redirect
      window.location.href = options?.callbackUrl || '/auth/login'
    }

  } catch (error) {
    console.error('Error during sign out:', error)
    
    // Emergency fallback
    if (typeof window !== 'undefined') {
      // Clear everything aggressively
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.includes('next-auth')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname.split('.').slice(-2).join('.')}`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })
      
      // Force redirect
      window.location.href = options?.callbackUrl || '/auth/login'
    }
  }
}

/**
 * Server-side function to clean up cookies in API routes or server actions
 */
export const cleanupCookiesServerSide = (response: Response) => {
  const cookiesToClean = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token',
    'next-auth.pkce.code_verifier'
  ]

  cookiesToClean.forEach(cookieName => {
    response.headers.append(
      'Set-Cookie',
      `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0;`
    )
  })

  return response
}
