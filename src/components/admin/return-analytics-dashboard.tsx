'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Package
} from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalReturns: number
    overdueReturns: number
    overdueRate: number
    damageReports: number
    avgPlannedTime: number
    avgActualTime: number
    penaltyCount: number
    totalPenalties: number
    avgPenalty: number
  }
  breakdowns: {
    byStatus: Array<{ status: string; count: number }>
    byCondition: Array<{ condition: string; count: number }>
    topCategories: Array<{ category: string; itemName: string; count: number }>
    topUsers: Array<{ 
      userId: string
      name: string
      email: string
      trustScore: number
      returnCount: number
      avgPenalty: number
    }>
  }
  trends: {
    daily: Array<{ date: string; count: number }>
    timeframe: string
    startDate: string
    endDate: string
  }
  metadata: {
    generatedAt: string
    timeframe: string
    filters: any
  }
}

interface ReturnAnalyticsDashboardProps {
  onClose?: () => void
}

export default function ReturnAnalyticsDashboard({ onClose }: ReturnAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        timeframe: timeframe
      })
      
      const response = await fetch(`/api/returns/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  const handleExport = async (format: 'csv' | 'json', type: 'summary' | 'detailed' | 'damage_reports') => {
    try {
      setExportLoading(true)
      
      const params = new URLSearchParams({
        format,
        type,
        timeframe: timeframe
      })
      
      const response = await fetch(`/api/returns/analytics/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }
      
      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `return-analytics-${type}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      setError('Failed to export data. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'REJECTED': return 'bg-red-500'
      case 'DAMAGED': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT': return 'bg-green-500'
      case 'GOOD': return 'bg-blue-500'
      case 'FAIR': return 'bg-yellow-500'
      case 'POOR': return 'bg-orange-500'
      case 'DAMAGED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      case '1y': return 'Last Year'
      case 'all': return 'All Time'
      default: return tf
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64 text-red-500">
          <AlertTriangle className="h-8 w-8 mr-2" />
          <span className="text-lg">{error}</span>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Return Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into return patterns and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            <Label>Period:</Label>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          {/* Export Options */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleExport('csv', 'summary')}
              disabled={exportLoading}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('json', 'detailed')}
              disabled={exportLoading}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
          </div>

          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Returns</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalReturns}</p>
            </div>
            <Package className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">{formatTimeframe(timeframe)}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Returns</p>
              <p className="text-3xl font-bold text-orange-600">{analytics.summary.overdueReturns}</p>
            </div>
            <Clock className="h-10 w-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.summary.overdueRate}% of all returns
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Damage Reports</p>
              <p className="text-3xl font-bold text-red-600">{analytics.summary.damageReports}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.summary.totalReturns > 0 
              ? `${((analytics.summary.damageReports / analytics.summary.totalReturns) * 100).toFixed(1)}% of returns`
              : 'No returns recorded'
            }
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Penalties</p>
              <p className="text-3xl font-bold text-purple-600">{analytics.summary.totalPenalties.toFixed(1)}</p>
            </div>
            <TrendingDown className="h-10 w-10 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.summary.penaltyCount} penalties applied
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Return Status Breakdown */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <PieChart className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="text-lg font-semibold">Returns by Status</h3>
          </div>
          <div className="space-y-3">
            {analytics.breakdowns.byStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)} mr-3`}></div>
                  <span className="text-sm capitalize">{item.status.toLowerCase()}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{item.count}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({analytics.summary.totalReturns > 0 
                      ? ((item.count / analytics.summary.totalReturns) * 100).toFixed(1)
                      : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Return Condition Breakdown */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
            <h3 className="text-lg font-semibold">Returns by Condition</h3>
          </div>
          <div className="space-y-3">
            {analytics.breakdowns.byCondition.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getConditionColor(item.condition)} mr-3`}></div>
                  <span className="text-sm capitalize">{item.condition.toLowerCase()}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{item.count}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({analytics.summary.totalReturns > 0 
                      ? ((item.count / analytics.summary.totalReturns) * 100).toFixed(1)
                      : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Categories and Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Categories */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Activity className="h-5 w-5 mr-2 text-indigo-500" />
            <h3 className="text-lg font-semibold">Most Returned Categories</h3>
          </div>
          <div className="space-y-3">
            {analytics.breakdowns.topCategories.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.category}</p>
                  <p className="text-sm text-gray-600">{item.itemName}</p>
                </div>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                  {item.count} returns
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Users */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 mr-2 text-pink-500" />
            <h3 className="text-lg font-semibold">Most Active Users</h3>
          </div>
          <div className="space-y-3">
            {analytics.breakdowns.topUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">Trust Score: {user.trustScore.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                    {user.returnCount} returns
                  </Badge>
                  {user.avgPenalty > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Avg Penalty: {user.avgPenalty.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-gray-600">Average Planned Duration</p>
            <p className="text-2xl font-bold text-emerald-600">{analytics.summary.avgPlannedTime} days</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Average Actual Duration</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.summary.avgActualTime} days</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Overdue Rate</p>
            <p className="text-2xl font-bold text-orange-600">{analytics.summary.overdueRate}%</p>
          </div>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Download className="h-5 w-5 mr-2 text-gray-500" />
          <h3 className="text-lg font-semibold">Export Options</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => handleExport('csv', 'summary')}
            disabled={exportLoading}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Summary Report (CSV)
          </Button>
          <Button
            onClick={() => handleExport('csv', 'detailed')}
            disabled={exportLoading}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Detailed Report (CSV)
          </Button>
          <Button
            onClick={() => handleExport('csv', 'damage_reports')}
            disabled={exportLoading}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Damage Reports (CSV)
          </Button>
        </div>
      </Card>

      {/* Metadata */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <p>Report generated at {new Date(analytics.metadata.generatedAt).toLocaleString()}</p>
        <p>Period: {analytics.trends.startDate.split('T')[0]} to {analytics.trends.endDate.split('T')[0]}</p>
      </div>
    </div>
  )
}