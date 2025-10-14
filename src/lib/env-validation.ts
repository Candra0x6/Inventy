// Environment validation utility
export function validateAuthEnvironment() {
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ]

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  } else {
    console.log('✅ All required auth environment variables are set')
    console.log('🔗 NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
  }
}

// Auto-validate in production
if (process.env.NODE_ENV === 'production') {
  validateAuthEnvironment()
}
