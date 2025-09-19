import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BorrowingDashboard from '@/components/dashboard/borrowing-dashboard'
import DashboardSkeleton from '@/components/dashboard/dashboard-skeleton'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Role-based dashboard rendering
  const renderDashboard = () => {
    switch (session.user.role) {
      case 'SUPER_ADMIN':
        redirect('/dashboard/items')
      case 'MANAGER':
        redirect('/dashboard/items')
      case 'STAFF':
        redirect('/dashboard/items')
      case 'BORROWER':
      default:
        return <BorrowingDashboard />
    }
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {renderDashboard()}
    </Suspense>
  )
}
