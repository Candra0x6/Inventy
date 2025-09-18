'use client'

import { useSession } from 'next-auth/react'
import BorrowingDashboard from '@/components/dashboard/borrowing-dashboard'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MyBorrowingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    
        
        <BorrowingDashboard />
   
  )
}