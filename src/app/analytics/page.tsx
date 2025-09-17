import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReturnAnalyticsDashboard from '@/components/admin/return-analytics-dashboard'
import { RefreshCw } from 'lucide-react'

async function AnalyticsPageContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has permission to view analytics
  if (!['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')) {
    redirect('/unauthorized')
  }

  return <ReturnAnalyticsDashboard />
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading analytics...</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<AnalyticsLoadingSkeleton />}>
        <AnalyticsPageContent />
      </Suspense>
    </div>
  )
}