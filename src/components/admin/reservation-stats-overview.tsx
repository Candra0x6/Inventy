'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Users, 
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface ReservationStats {
  overview: {
    totalReservations: number
    pendingReservations: number
    approvedReservations: number
    rejectedReservations: number
    cancelledReservations: number
    completedReservations: number
    activeReservations: number
  }
  trends: {
    weeklyGrowth: number
    monthlyGrowth: number
    approvalRate: number
    utilizationRate: number
  }
  insights: {
    totalUsers: number
    activeUsers: number
    totalItems: number
    availableItems: number
    popularItems: Array<{
      id: string
      name: string
      reservationCount: number
    }>
    peakReservationDays: string[]
  }
  recentActivity: Array<{
    id: string
    type: 'created' | 'approved' | 'rejected' | 'cancelled' | 'completed'
    userName: string
    itemName: string
    timestamp: string
  }>
}

interface ReservationStatsOverviewProps {
  className?: string
}

export default function ReservationStatsOverview({ className }: ReservationStatsOverviewProps) {
  const [data, setData] = useState<ReservationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/reservations/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch statistics')
        }
        const stats = await response.json()
        setData(stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Statistics</p>
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Reservations',
      value: data.overview.totalReservations,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: `+${data.trends.weeklyGrowth}% this week`,
    },
    {
      title: 'Pending Review',
      value: data.overview.pendingReservations,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      badge: data.overview.pendingReservations > 0 ? 'urgent' : undefined,
    },
    {
      title: 'Active Reservations',
      value: data.overview.activeReservations,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Completed',
      value: data.overview.completedReservations,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Approval Rate',
      value: `${data.trends.approvalRate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Utilization Rate',
      value: `${data.trends.utilizationRate}%`,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Active Users',
      value: data.insights.activeUsers,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: `Of ${data.insights.totalUsers} total users`,
    },
    {
      title: 'Available Items',
      value: data.insights.availableItems,
      icon: Package,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: `Of ${data.insights.totalItems} total items`,
    }
  ]

  const issueCards = [
    {
      title: 'Rejected',
      value: data.overview.rejectedReservations,
      color: 'text-red-600',
    },
    {
      title: 'Cancelled',
      value: data.overview.cancelledReservations,
      color: 'text-orange-600',
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservation Statistics</h2>
        <p className="text-gray-600">Overview of reservation management and system performance</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              {card.badge === 'urgent' && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  Needs Attention
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.trend && (
                <p className="text-sm text-gray-500">{card.trend}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Issues Alert */}
      {(data.overview.rejectedReservations > 0 || data.overview.cancelledReservations > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Issues Requiring Attention</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issueCards.map((card, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{card.title}</span>
                  <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Approval Rate</span>
            <span className={`text-lg font-semibold ${
              data.trends.approvalRate >= 80 ? 'text-green-600' :
              data.trends.approvalRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {data.trends.approvalRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                data.trends.approvalRate >= 80 ? 'bg-green-500' :
                data.trends.approvalRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${data.trends.approvalRate}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Utilization Rate</span>
            <span className="text-lg font-semibold text-blue-600">{data.trends.utilizationRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${data.trends.utilizationRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Popular Items */}
      {data.insights.popularItems.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Reserved Items</h3>
          <div className="space-y-3">
            {data.insights.popularItems.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {item.reservationCount} reservations
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}