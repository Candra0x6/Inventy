import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BorrowingDashboard from '@/components/dashboard/borrowing-dashboard'
import DashboardSkeleton from '@/components/dashboard/dashboard-skeleton'
import ItemManagementTable from '@/components/admin/item-management-table'
import ReservationManagementTable from '@/components/admin/reservation-management-table'
import ReservationStatsOverview from '@/components/admin/reservation-stats-overview'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  console.log('User Role:', session.user.role)
  // Role-based dashboard rendering
  const renderDashboard = () => {
    switch (session.user.role) {
      case 'SUPER_ADMIN':
          return (
           <div>   <ReservationStatsOverview />
                                  <ReservationManagementTable /></div>
        )
      case 'MANAGER':
          return (
           <div>   <ReservationStatsOverview />
                                  <ReservationManagementTable /></div>
        )
      case 'STAFF':
        return (
           <div>   <ReservationStatsOverview />
                                  <ReservationManagementTable /></div>
        )
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
