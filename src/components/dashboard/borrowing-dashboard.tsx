'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import ReputationDisplay from '@/components/profile/reputation-display'
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Eye,
  ArrowRight,
  Bell,
  Star,
  XCircle,
  Hourglass,
  MapPin,
  User,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  Download,
  Settings
} from 'lucide-react'
import { Item, Reservation } from '@prisma/client'

interface BorrowedItem {
  id: string
  reservation: Reservation
  item: Item
  daysRemaining: number
  isOverdue: boolean
  daysOverdue: number
  canExtend: boolean
  canReturn: boolean
  canCancel: boolean
}

interface DashboardStats {
  totalBorrowed: number
  activeBorrowings: number
  overdueBorrowings: number
  completedBorrowings: number
  pendingRequests: number
  totalReturns: number
}

interface UsageAnalytics {
  mostBorrowedCategories: Array<{ category: string; count: number }>
  borrowingTrends: Array<{ month: string; count: number }>
  averageBorrowDuration: number
  punctualityRate: number
}

interface NotificationItem {
  id: string
  type: 'overdue' | 'due_soon' | 'approved' | 'rejected' | 'reminder'
  title: string
  message: string
  createdAt: string
  isRead: boolean
  actionUrl?: string
}

export default function BorrowingDashboard() {
  const { user } = useAuth()
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'analytics' | 'notifications'>('overview')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'due_soon'>('all')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [statsRes, itemsRes, analyticsRes, notificationsRes] = await Promise.all([
        fetch('/api/user/borrowing-stats'),
        fetch('/api/user/borrowed-items'),
        fetch('/api/user/usage-analytics'),
        fetch('/api/user/notifications?limit=10')
      ])

      if (statsRes.ok) {
        const stats = await statsRes.json()
        setDashboardStats(stats)
      }

      if (itemsRes.ok) {
        const items = await itemsRes.json()
        setBorrowedItems(items.items || [])
      }

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json()
        setUsageAnalytics(analytics)
      }

      if (notificationsRes.ok) {
        const notif = await notificationsRes.json()
        setNotifications(notif.notifications || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleExtendBorrowing = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalDays: 7 })
      })

      if (response.ok) {
        fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error extending borrowing:', error)
    }
  }

  const handleReturnItem = async (reservationId: string, itemId: string) => {
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          itemId,
          returnDate: new Date().toISOString(),
          conditionOnReturn: 'GOOD' // This should be a form in real implementation
        })
      })

      if (response.ok) {
        fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error returning item:', error)
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
    }
  }

  const getFilteredItems = () => {
    switch (filterStatus) {
      case 'active':
        return borrowedItems.filter(item => !item.isOverdue && item.daysRemaining > 0)
      case 'overdue':
        return borrowedItems.filter(item => item.isOverdue)
      case 'due_soon':
        return borrowedItems.filter(item => item.daysRemaining <= 3 && item.daysRemaining > 0)
      default:
        return borrowedItems
    }
  }

  const getStatusColor = (item: BorrowedItem) => {
    if (item.isOverdue) return 'text-red-600 bg-red-50 border-red-200'
    if (item.daysRemaining <= 3) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (item.daysRemaining <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'due_soon': return <Clock className="h-4 w-4 text-orange-500" />
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                My Borrowing Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your borrowed items, track usage, and stay on top of return dates
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => window.location.href = '/items'}>
                <Search className="h-4 w-4 mr-2" />
                Browse Items
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Borrowed</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardStats?.totalBorrowed || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardStats?.activeBorrowings || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboardStats?.overdueBorrowings || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dashboardStats?.pendingRequests || 0}
                  </p>
                </div>
                <Hourglass className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dashboardStats?.completedBorrowings || 0}
                  </p>
                </div>
                <Star className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Trust Score</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {(user as any)?.trustScore?.toFixed(1) || '100.0'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Overview</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>My Items ({borrowedItems.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs">
                      {notifications.filter(n => !n.isRead).length}
                    </Badge>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reputation Display */}
                <div className="lg:col-span-1">
                  {user && (
                    <ReputationDisplay
                      userId={user.id}
                      currentTrustScore={(user as any)?.trustScore || 100}
                      showHistory={true}
                    />
                  )}
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Quick Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2"
                          onClick={() => window.location.href = '/items'}
                        >
                          <Search className="h-6 w-6" />
                          <span className="text-xs">Browse Items</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2"
                          onClick={() => window.location.href = '/reservations'}
                        >
                          <Calendar className="h-6 w-6" />
                          <span className="text-xs">My Reservations</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2"
                          onClick={() => window.location.href = '/profile'}
                        >
                          <User className="h-6 w-6" />
                          <span className="text-xs">Profile</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2"
                          onClick={() => window.location.href = '/items/scan'}
                        >
                          <Package className="h-6 w-6" />
                          <span className="text-xs">QR Scanner</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Borrowed Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5" />
                          <span>Recent Borrowed Items</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('items')}>
                          View All <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {borrowedItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No borrowed items found</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => window.location.href = '/items'}
                          >
                            Browse Available Items
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {borrowedItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`p-4 rounded-lg border ${getStatusColor(item)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.item.name}</h4>
                                  <p className="text-sm text-gray-600">{item.item.category}</p>
                                  <div className="flex items-center mt-2 space-x-4 text-xs">
                                    <span>Due: {new Date(item.reservation.endDate).toLocaleDateString()}</span>
                                    {item.isOverdue ? (
                                      <Badge variant="destructive" className="text-xs">
                                        {item.daysOverdue} days overdue
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        {item.daysRemaining} days left
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  {item.canExtend && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleExtendBorrowing(item.reservation.id)}
                                    >
                                      Extend
                                    </Button>
                                  )}
                                  {item.canReturn && (
                                    <Button 
                                      size="sm"
                                      onClick={() => handleReturnItem(item.reservation.id, item.item.id)}
                                    >
                                      Return
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Label className="text-sm font-medium">Filter:</Label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="all">All Items ({borrowedItems.length})</option>
                      <option value="active">Active ({borrowedItems.filter(i => !i.isOverdue && i.daysRemaining > 0).length})</option>
                      <option value="overdue">Overdue ({borrowedItems.filter(i => i.isOverdue).length})</option>
                      <option value="due_soon">Due Soon ({borrowedItems.filter(i => i.daysRemaining <= 3 && i.daysRemaining > 0).length})</option>
                    </select>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export List
                  </Button>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredItems().map((item) => (
                    <Card key={item.id} className={`border ${getStatusColor(item).split(' ').slice(1).join(' ')}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.item.name}</CardTitle>
                            <p className="text-sm text-gray-600">{item.item.category}</p>
                            {item.item.location && (
                              <div className="flex items-center mt-1 text-sm text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.item.location}
                              </div>
                            )}
                          </div>
                          {item.item.images[0] && (
                            <img 
                              src={item.item.images[0]} 
                              alt={item.item.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Status and Timeline */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Borrowed:</span>
                            <span>{new Date(item.reservation.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Due Date:</span>
                            <span className={item.isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(item.reservation.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {item.isOverdue ? (
                            <Badge variant="destructive" className="w-full justify-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {item.daysOverdue} days overdue
                            </Badge>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Time Remaining:</span>
                                <span className={item.daysRemaining <= 3 ? 'text-orange-600 font-medium' : ''}>
                                  {item.daysRemaining} days
                                </span>
                              </div>
                              <Progress 
                                value={100 - (item.daysRemaining / ((new Date(item.reservation.endDate).getTime() - new Date(item.reservation.startDate).getTime()) / (1000 * 60 * 60 * 24))) * 100} 
                                className="h-2" 
                              />
                            </div>
                          )}
                        </div>

                        {/* Purpose */}
                        {item.reservation.purpose && (
                          <div className="text-sm">
                            <span className="text-gray-600">Purpose: </span>
                            <span>{item.reservation.purpose}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.location.href = `/items/${item.item.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {item.canExtend && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExtendBorrowing(item.reservation.id)}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Extend
                            </Button>
                          )}
                          
                          {item.canReturn && (
                            <Button 
                              size="sm"
                              onClick={() => handleReturnItem(item.reservation.id, item.item.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Return
                            </Button>
                          )}
                          
                          {item.canCancel && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelReservation(item.reservation.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {getFilteredItems().length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-600 mb-6">
                      {filterStatus === 'all' 
                        ? "You haven't borrowed any items yet." 
                        : `No items match the "${filterStatus}" filter.`}
                    </p>
                    <Button onClick={() => window.location.href = '/items'}>
                      <Search className="h-4 w-4 mr-2" />
                      Browse Available Items
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usage Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Usage Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {usageAnalytics?.averageBorrowDuration?.toFixed(1) || '0'} days
                          </div>
                          <div className="text-sm text-gray-600">Avg. Borrow Duration</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {usageAnalytics?.punctualityRate?.toFixed(1) || '0'}%
                          </div>
                          <div className="text-sm text-gray-600">On-time Return Rate</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Most Borrowed Categories</h4>
                        <div className="space-y-3">
                          {usageAnalytics?.mostBorrowedCategories?.map((cat, index) => (
                            <div key={cat.category} className="flex items-center justify-between">
                              <span className="text-sm">{cat.category}</span>
                              <div className="flex items-center space-x-2">
                                <Progress value={(cat.count / Math.max(...(usageAnalytics?.mostBorrowedCategories?.map(c => c.count) || [1]))) * 100} className="w-20 h-2" />
                                <span className="text-sm font-medium w-8">{cat.count}</span>
                              </div>
                            </div>
                          )) || (
                            <p className="text-sm text-gray-500 text-center py-4">No usage data available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Borrowing Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Borrowing Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {usageAnalytics?.borrowingTrends?.map((trend, index) => (
                        <div key={trend.month} className="flex items-center justify-between">
                          <span className="text-sm">{trend.month}</span>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={(trend.count / Math.max(...(usageAnalytics?.borrowingTrends?.map(t => t.count) || [1]))) * 100} 
                              className="w-24 h-2" 
                            />
                            <span className="text-sm font-medium w-8">{trend.count}</span>
                          </div>
                        </div>
                      )) || (
                        <p className="text-sm text-gray-500 text-center py-8">No trend data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                    <p className="text-gray-600">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Card key={notification.id} className={notification.isRead ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{notification.title}</h4>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            {notification.actionUrl && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-3"
                                onClick={() => window.location.href = notification.actionUrl!}
                              >
                                Take Action
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}