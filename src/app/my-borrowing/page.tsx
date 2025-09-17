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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Borrowing Dashboard</h1>
          <p className="text-gray-600">
            Manage your borrowed items, track deadlines, and view your borrowing analytics
          </p>
        </div>
        
        <BorrowingDashboard />
      </div>
    </div>
  )
}