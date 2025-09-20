import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MyItemsPage from '@/components/dashboard/my-items-page'
import DashboardSkeleton from '@/components/dashboard/dashboard-skeleton'

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Only allow BORROWER role to access this page
  if (session.user.role !== 'BORROWER') {
    redirect('/dashboard/items')
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyItemsPage />
    </Suspense>
  )
}