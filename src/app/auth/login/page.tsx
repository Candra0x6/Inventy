"use client"

import { useState, useEffect } from "react"
import { signIn, getSession, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Partial<LoginFormData>>({})
  const [loading, setLoading] = useState(false)
  const [hasGoogleHistory, setHasGoogleHistory] = useState(false)
  const [emailGoogleStatus, setEmailGoogleStatus] = useState<{
    hasGoogleAccount: boolean
    userExists: boolean
    checked: boolean
  }>({
    hasGoogleAccount: false,
    userExists: false,
    checked: false
  })
  const router = useRouter()
  const { data: session } = useSession()

  // Check if user has previously signed in with Google
  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (session?.user) {
      router.push("/dashboard")
      return
    }

    // Check localStorage for Google sign-in history
    const googleSignInHistory = localStorage.getItem('google-signin-history')
    if (googleSignInHistory) {
      setHasGoogleHistory(true)
    }
  }, [session, router])

  // Check if email has Google account when email changes
  useEffect(() => {
    const checkEmailGoogleStatus = async () => {
      if (!formData.email || !formData.email.includes('@')) {
        setEmailGoogleStatus({ hasGoogleAccount: false, userExists: false, checked: false })
        return
      }

      try {
        const response = await fetch('/api/auth/check-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        })
        
        if (response.ok) {
          const data = await response.json()
          setEmailGoogleStatus({ 
            hasGoogleAccount: data.hasGoogleAccount,
            userExists: data.userExists,
            checked: true 
          })
        }
      } catch (error) {
        console.error('Error checking email Google status:', error)
      }
    }

    const debounceTimer = setTimeout(checkEmailGoogleStatus, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const validatedData = loginSchema.parse(formData)
      
      const result = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      })

      if (result?.error) {
        setErrors({ email: "Invalid credentials" })
      } else {
        // Refresh session and redirect
        await getSession()
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<LoginFormData> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof LoginFormData] = issue.message
          }
        })
        setErrors(fieldErrors)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Store Google sign-in attempt in localStorage
    localStorage.setItem('google-signin-history', 'true')
    setHasGoogleHistory(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="bg-white py-8 px-6 shadow rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
            {/* Email Google Status Indicator */}
            {emailGoogleStatus.checked && formData.email && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1">
                {emailGoogleStatus.hasGoogleAccount ? (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-1 text-xs text-green-600">Google</span>
                  </div>
                ) : emailGoogleStatus.userExists ? (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-1 text-xs text-gray-500">No Google</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          {/* Email Status Message */}
          {emailGoogleStatus.checked && formData.email && (
            <div className="mt-1">
              {emailGoogleStatus.hasGoogleAccount ? (
                <p className="text-xs text-green-600">✓ This email is linked to a Google account</p>
              ) : emailGoogleStatus.userExists ? (
                <p className="text-xs text-gray-500">This email exists but is not linked to Google</p>
              ) : (
                <p className="text-xs text-gray-500">No account found with this email</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className={`w-full flex justify-center items-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative ${
            emailGoogleStatus.hasGoogleAccount 
              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {emailGoogleStatus.hasGoogleAccount 
            ? "Continue with Google" 
            : hasGoogleHistory 
              ? "Continue with Google" 
              : "Sign in with Google"
          }
          
          {/* Indicators */}
          {(emailGoogleStatus.hasGoogleAccount || hasGoogleHistory) && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>

        {/* Status Messages */}
        <div className="text-center space-y-1">
          {emailGoogleStatus.hasGoogleAccount && (
            <p className="text-sm text-green-600 flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              This email is linked to Google
            </p>
          )}
          {hasGoogleHistory && !emailGoogleStatus.hasGoogleAccount && (
            <p className="text-sm text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Previously used Google sign-in
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
