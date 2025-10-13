'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { customSignOut } from '@/lib/auth/custom-signout'
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  BarChart3,
  Users,
  Search,
  RefreshCw,
  Calendar,
  Shield
} from 'lucide-react'
import StatusOverviewCards from './status-overview-cards'
import StatusDistributionChart from './status-distribution-chart'
import RecentStatusChanges from './recent-status-changes'
import OverdueItemsAlert from './overdue-items-alert'
import QuickActions from './quick-actions'

interface StatusChange {
  id: string
  action: string
  entityId: string
  changes: {
    field: string
    from: string
    to: string
    reason?: string
  }
  user: {
    id: string
    name: string | null
    email: string
    role: string
  } | null
  createdAt: string
}

interface OverdueItem {
  id: string
  name: string
  status: string
  borrower: {
    id: string
    name: string | null
    email: string
  }
  dueDate: string
  daysOverdue: number
}

interface DashboardData {
  statusCounts: Record<string, number>
  recentChanges: StatusChange[]
  overdueItems: OverdueItem[]
  availableStatuses: string[]
}

function DashboardContent() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/items/status')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalItems = dashboardData ? Object.values(dashboardData.statusCounts).reduce((a, b) => a + b, 0) : 0
  const availableItems = dashboardData?.statusCounts?.AVAILABLE || 0
  const borrowedItems = dashboardData?.statusCounts?.BORROWED || 0
  const overdueCount = dashboardData?.overdueItems?.length || 0

  return (
    <>
      {/* Header Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Inventy Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  {user?.name || user?.email}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user?.role}
                </span>
              </div>
              
              <button
                onClick={() => customSignOut({ callbackUrl: '/auth/login' })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || 'User'}!
            </h2>
            <p className="text-gray-600">
              Here&apos;s what&apos;s happening with your inventory today.
            </p>
          </div>

          {/* Alert for Overdue Items */}
          {overdueCount > 0 && (
            <div className="mb-6">
              <OverdueItemsAlert 
                count={overdueCount} 
                items={dashboardData?.overdueItems || []} 
              />
            </div>
          )}

          {/* Status Overview Cards */}
          <div className="mb-8">
            <StatusOverviewCards 
              data={dashboardData}
              isLoading={isLoading}
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Distribution Chart */}
            <div className="lg:col-span-2">
              <StatusDistributionChart 
                data={dashboardData?.statusCounts || {}}
                isLoading={isLoading}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <QuickActions 
                userRole={user?.role}
                totalItems={totalItems}
                availableItems={availableItems}
              />
            </div>
          </div>

          {/* Recent Activity and Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Status Changes */}
            <RecentStatusChanges 
              changes={dashboardData?.recentChanges || []}
              isLoading={isLoading}
            />

            {/* Quick Stats Panel */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Quick Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Total Items</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{totalItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <span className="text-sm text-gray-600">Available</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{availableItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-400 mr-2" />
                      <span className="text-sm text-gray-600">Currently Borrowed</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{borrowedItems}</span>
                  </div>
                  
                  {overdueCount > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <span className="text-sm text-gray-600">Overdue Items</span>
                      </div>
                      <span className="text-sm font-medium text-red-600">{overdueCount}</span>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Utilization Rate</span>
                      <span className="text-sm font-medium text-gray-900">
                        {totalItems > 0 ? Math.round((borrowedItems / totalItems) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quick Navigation
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Link
                  href="/items"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Search className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Browse Items</span>
                </Link>
                
                <Link
                  href="/items/add"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Add Item</span>
                </Link>
                
                <Link
                  href="/reservations"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Reservations</span>
                </Link>
                
                <Link
                  href="/items/scan"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Scan Barcode</span>
                </Link>
                
                <Link
                  href="/profile"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Settings</span>
                </Link>

                {/* Super Admin Dashboard - Only visible to SUPER_ADMIN */}
                {user?.role === 'SUPER_ADMIN' && (
                  <Link
                    href="/admin"
                    className="flex items-center p-3 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Shield className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-700 font-medium">Admin Panel</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default DashboardContent