'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth/auth-context'
import ReputationDisplay from '@/components/profile/reputation-display'
import { Breadcrumb } from '@/components/navigation/breadcrumb'
import { DropdownMenu, MobileMenu } from '@/components/navigation/dropdown-menu'
import { ResponsiveFilter } from '@/components/ui/responsive-components'
import { LoadingState, EmptyState } from '@/components/ui/loading-states'
import { ExtendDialog, ReturnDialog, CancelDialog } from '@/components/ui/confirmation-dialog'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  Package,
  CheckCircle,
  AlertTriangle,
  Hourglass,
  TrendingUp,
  BarChart3,
  Bell,
  RefreshCw,
  Search,
  Calendar,
  User,
  Settings,
  ArrowRight,
  Clock,
  Download,
  XCircle,
  Eye,
  MapPin
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
  pendingRequests: number
  completedBorrowings: number
}

interface Notification {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

interface UsageAnalytics {
  averageBorrowDuration: number
  punctualityRate: number
  mostBorrowedCategories: { category: string; count: number }[]
  borrowingTrends: { month: string; count: number }[]
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
  badgeColor?: string
  className?: string
}

function TabButton({ active, onClick, icon, label, badge, badgeColor = 'bg-primary', className = '' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${className} ${
        active
          ? 'border-primary text-primary bg-primary/5'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

export default function BorrowingDashboard() {
  const { user } = useAuth()
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'analytics' | 'notifications'>('overview')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'due_soon'>('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [extendDialog, setExtendDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [returnDialog, setReturnDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

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
  const handleExtendBorrowing = (item: BorrowedItem) => {
    setExtendDialog({ isOpen: true, item, loading: false })
  }

  const confirmExtendBorrowing = async () => {
    if (!extendDialog.item) return
    
    setExtendDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${extendDialog.item!.reservation.id}/extend`, {
        method: 'POST',
      })
      if (response.ok) {
        await fetchDashboardData()
        setExtendDialog({ isOpen: false, item: null, loading: false })
      }
    } catch (error) {
      console.error('Error extending borrowing:', error)
      setExtendDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleReturnItem = (item: BorrowedItem) => {
    setReturnDialog({ isOpen: true, item, loading: false })
  }

  const confirmReturnItem = async () => {
    if (!returnDialog.item) return
    
    setReturnDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${returnDialog.item!.reservation.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: returnDialog.item!.item.id })
      })
      if (response.ok) {
        await fetchDashboardData()
        setReturnDialog({ isOpen: false, item: null, loading: false })
      }
    } catch (error) {
      console.error('Error returning item:', error)
      setReturnDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCancelReservation = (item: BorrowedItem) => {
    setCancelDialog({ isOpen: true, item, loading: false })
  }

  const confirmCancelReservation = async () => {
    if (!cancelDialog.item) return
    
    setCancelDialog(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`/api/reservations/${cancelDialog.item!.reservation.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchDashboardData()
        setCancelDialog({ isOpen: false, item: null, loading: false })
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      setCancelDialog(prev => ({ ...prev, loading: false }))
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <LoadingState 
          variant="page" 
          message="Loading your dashboard..."
          className="max-w-7xl mx-auto px-4 lg:px-6 py-8"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header with Breadcrumbs */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Breadcrumb Navigation */}
          <div className="py-3 border-b border-border/30">
            <Breadcrumb 
              items={[
                { label: 'My Borrowing', isActive: true }
              ]}
            />
          </div>
          
          {/* Main Header */}
          <div className="py-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <motion.div variants={fadeInUp} className="space-y-1">
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  My Borrowing Dashboard
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                  Manage your borrowed items and track usage efficiently
                </p>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="flex items-center gap-2">
                {/* Quick Actions Dropdown */}
                <DropdownMenu
                  trigger={<span>Quick Actions</span>}
                  items={[
                    { 
                      label: 'Browse Items', 
                      href: '/items',
                      icon: <Search className="h-4 w-4" />,
                      description: 'Find new items to borrow'
                    },
                    { 
                      label: 'My Reservations', 
                      href: '/reservations',
                      icon: <Calendar className="h-4 w-4" />,
                      description: 'View upcoming reservations'
                    },
                    { 
                      label: 'QR Scanner', 
                      href: '/items/scan',
                      icon: <Package className="h-4 w-4" />,
                      description: 'Scan item QR codes'
                    }
                  ]}
                />
                
                <AnimatedButton variant="outline" size="sm" onClick={fetchDashboardData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </AnimatedButton>
                
                {/* Mobile Menu */}
                <MobileMenu 
                  isOpen={mobileMenuOpen} 
                  onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <nav className="space-y-3">
                    <Link href="/items" className="block py-2 text-sm font-medium hover:text-primary transition-colors">
                      Browse Items
                    </Link>
                    <Link href="/reservations" className="block py-2 text-sm font-medium hover:text-primary transition-colors">
                      My Reservations
                    </Link>
                    <Link href="/profile" className="block py-2 text-sm font-medium hover:text-primary transition-colors">
                      Profile
                    </Link>
                    <Link href="/items/scan" className="block py-2 text-sm font-medium hover:text-primary transition-colors">
                      QR Scanner
                    </Link>
                  </nav>
                </MobileMenu>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Streamlined Stats Overview - Only Essential Metrics */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">At a Glance</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Priority Metrics - Reduced from 6 to 4 essential ones */}
              <AnimatedCard className="p-4 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                <motion.div whileHover={{ scale: 1.02 }} className="text-center space-y-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mx-auto">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardStats?.activeBorrowings || 0}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Active Items</p>
                  </div>
                </motion.div>
              </AnimatedCard>

              <AnimatedCard className="p-4 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                <motion.div whileHover={{ scale: 1.02 }} className="text-center space-y-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg w-fit mx-auto">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {dashboardStats?.overdueBorrowings || 0}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Overdue</p>
                  </div>
                </motion.div>
              </AnimatedCard>

              <AnimatedCard className="p-4 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                <motion.div whileHover={{ scale: 1.02 }} className="text-center space-y-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg w-fit mx-auto">
                    <Hourglass className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {dashboardStats?.pendingRequests || 0}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Pending</p>
                  </div>
                </motion.div>
              </AnimatedCard>

              <AnimatedCard className="p-4 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                <motion.div whileHover={{ scale: 1.02 }} className="text-center space-y-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg w-fit mx-auto">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">
                      {(user as { trustScore?: number })?.trustScore?.toFixed(0) || '100'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Trust Score</p>
                  </div>
                </motion.div>
              </AnimatedCard>
            </div>
          </motion.div>

          {/* Simplified Tab Navigation */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              {/* Mobile-First Tab Navigation */}
              <div className="border-b border-border/30">
                <div className="flex overflow-x-auto scrollbar-hide">
                  <nav className="flex space-x-0 min-w-full" aria-label="Tabs">
                    <TabButton
                      active={activeTab === 'overview'}
                      onClick={() => setActiveTab('overview')}
                      icon={<BarChart3 className="w-4 h-4" />}
                      label="Overview"
                      badge={borrowedItems.filter(i => i.isOverdue).length > 0 ? borrowedItems.filter(i => i.isOverdue).length : undefined}
                    />
                    <TabButton
                      active={activeTab === 'items'}
                      onClick={() => setActiveTab('items')}
                      icon={<Package className="w-4 h-4" />}
                      label="My Items"
                      badge={borrowedItems.length}
                    />
                    <TabButton
                      active={activeTab === 'analytics'}
                      onClick={() => setActiveTab('analytics')}
                      icon={<TrendingUp className="w-4 h-4" />}
                      label="Analytics"
                      className="hidden sm:flex"
                    />
                    <TabButton
                      active={activeTab === 'notifications'}
                      onClick={() => setActiveTab('notifications')}
                      icon={<Bell className="w-4 h-4" />}
                      label="Alerts"
                      badge={notifications.filter(n => !n.isRead).length}
                      badgeColor="bg-red-500"
                    />
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                <motion.div
                  key={activeTab}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-8"
                >
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Reputation Display */}
                      <div className="lg:col-span-1">
                        {user && (
                          <ReputationDisplay
                            userId={user.id}
                            currentTrustScore={(user as { trustScore?: number })?.trustScore || 100}
                            showHistory={true}
                          />
                        )}
                      </div>

                      {/* Quick Actions & Recent Activity */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Quick Actions */}
                        <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Settings className="h-5 w-5" />
                              <span>Quick Actions</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <AnimatedButton 
                                variant="outline" 
                                className="h-20 flex-col space-y-2"
                                onClick={() => window.location.href = '/items'}
                              >
                                <Search className="h-6 w-6" />
                                <span className="text-xs">Browse Items</span>
                              </AnimatedButton>
                              <AnimatedButton 
                                variant="outline" 
                                className="h-20 flex-col space-y-2"
                                onClick={() => window.location.href = '/reservations'}
                              >
                                <Calendar className="h-6 w-6" />
                                <span className="text-xs">My Reservations</span>
                              </AnimatedButton>
                              <AnimatedButton 
                                variant="outline" 
                                className="h-20 flex-col space-y-2"
                                onClick={() => window.location.href = '/profile'}
                              >
                                <User className="h-6 w-6" />
                                <span className="text-xs">Profile</span>
                              </AnimatedButton>
                              <AnimatedButton 
                                variant="outline" 
                                className="h-20 flex-col space-y-2"
                                onClick={() => window.location.href = '/items/scan'}
                              >
                                <Package className="h-6 w-6" />
                                <span className="text-xs">QR Scanner</span>
                              </AnimatedButton>
                            </div>
                          </CardContent>
                        </AnimatedCard>

                        {/* Recent Borrowed Items */}
                        <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5" />
                                <span>Recent Borrowed Items</span>
                              </div>
                              <AnimatedButton variant="outline" size="sm" onClick={() => setActiveTab('items')}>
                                View All <ArrowRight className="h-4 w-4 ml-1" />
                              </AnimatedButton>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {borrowedItems.length === 0 ? (
                              <EmptyState
                                icon={<Package className="h-12 w-12 mx-auto text-muted-foreground/50" />}
                                title="No borrowed items found"
                                description="You haven't borrowed any items yet. Browse our inventory to get started."
                                action={
                                  <AnimatedButton onClick={() => window.location.href = '/items'}>
                                    Browse Available Items
                                  </AnimatedButton>
                                }
                              />
                            ) : (
                              <div className="space-y-3">
                                {borrowedItems.slice(0, 3).map((item) => (
                                  <motion.div
                                    key={item.id}
                                    whileHover={{ scale: 1.01 }}
                                    className={`p-4 rounded-lg border backdrop-blur-sm ${
                                      item.isOverdue 
                                        ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20' 
                                        : item.daysRemaining <= 3 
                                        ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20'
                                        : 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-medium">{item.item.name}</h4>
                                        <p className="text-sm text-muted-foreground">{item.item.category}</p>
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
                                          <AnimatedButton 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleExtendBorrowing(item)}
                                          >
                                            Extend
                                          </AnimatedButton>
                                        )}
                                        {item.canReturn && (
                                          <AnimatedButton 
                                            size="sm"
                                            onClick={() => handleReturnItem(item)}
                                          >
                                            Return
                                          </AnimatedButton>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </AnimatedCard>
                      </div>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className="space-y-6">
                      {/* Responsive Filters */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                          <Label className="text-sm font-medium whitespace-nowrap">Filter:</Label>
                          <ResponsiveFilter
                            options={[
                              { value: 'all', label: 'All Items', count: borrowedItems.length },
                              { value: 'active', label: 'Active', count: borrowedItems.filter(i => !i.isOverdue && i.daysRemaining > 0).length },
                              { value: 'overdue', label: 'Overdue', count: borrowedItems.filter(i => i.isOverdue).length },
                              { value: 'due_soon', label: 'Due Soon', count: borrowedItems.filter(i => i.daysRemaining <= 3 && i.daysRemaining > 0).length }
                            ]}
                            value={filterStatus}
                            onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'overdue' | 'due_soon')}
                            className="flex-1 sm:flex-none"
                          />
                        </div>
                        <AnimatedButton variant="outline" size="sm" className="w-full sm:w-auto">
                          <Download className="h-4 w-4 mr-2" />
                          Export List
                        </AnimatedButton>
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getFilteredItems().map((item) => (
                          <AnimatedCard 
                            key={item.id} 
                            className={`bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 ${
                              item.isOverdue 
                                ? 'border-red-200 dark:border-red-800' 
                                : item.daysRemaining <= 3 
                                ? 'border-orange-200 dark:border-orange-800'
                                : 'border-green-200 dark:border-green-800'
                            }`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{item.item.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground">{item.item.category}</p>
                                  {item.item.location && (
                                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {item.item.location}
                                    </div>
                                  )}
                                </div>
                                {item.item.images && item.item.images[0] && (
                                  <div className="w-16 h-16 bg-muted/20 rounded-lg flex items-center justify-center">
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                  </div>
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
                                  <span className="text-muted-foreground">Purpose: </span>
                                  <span>{item.reservation.purpose}</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <AnimatedButton 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => window.location.href = `/items/${item.item.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </AnimatedButton>
                                
                                {item.canExtend && (
                                  <AnimatedButton 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleExtendBorrowing(item)}
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Extend
                                  </AnimatedButton>
                                )}
                                
                                {item.canReturn && (
                                  <AnimatedButton 
                                    size="sm"
                                    onClick={() => handleReturnItem(item)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Return
                                  </AnimatedButton>
                                )}
                                
                                {item.canCancel && (
                                  <AnimatedButton 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleCancelReservation(item)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </AnimatedButton>
                                )}
                              </div>
                            </CardContent>
                          </AnimatedCard>
                        ))}
                      </div>

                      {getFilteredItems().length === 0 && (
                        <EmptyState
                          icon={<Package className="h-16 w-16 mx-auto text-muted-foreground/50" />}
                          title="No items found"
                          description={
                            filterStatus === 'all' 
                              ? "You haven't borrowed any items yet." 
                              : `No items match the "${filterStatus}" filter.`
                          }
                          action={
                            <AnimatedButton onClick={() => window.location.href = '/items'}>
                              <Search className="h-4 w-4 mr-2" />
                              Browse Available Items
                            </AnimatedButton>
                          }
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Usage Statistics */}
                      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Usage Statistics</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {usageAnalytics?.averageBorrowDuration?.toFixed(1) || '0'} days
                                </div>
                                <div className="text-sm text-muted-foreground">Avg. Borrow Duration</div>
                              </div>
                              <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {usageAnalytics?.punctualityRate?.toFixed(1) || '0'}%
                                </div>
                                <div className="text-sm text-muted-foreground">On-time Return Rate</div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-3">Most Borrowed Categories</h4>
                              <div className="space-y-3">
                                {usageAnalytics?.mostBorrowedCategories?.map((cat) => (
                                  <div key={cat.category} className="flex items-center justify-between">
                                    <span className="text-sm">{cat.category}</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={(cat.count / Math.max(...(usageAnalytics?.mostBorrowedCategories?.map(c => c.count) || [1]))) * 100} className="w-20 h-2" />
                                      <span className="text-sm font-medium w-8">{cat.count}</span>
                                    </div>
                                  </div>
                                )) || (
                                  <p className="text-sm text-muted-foreground text-center py-4">No usage data available</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>

                      {/* Borrowing Trends */}
                      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5" />
                            <span>Borrowing Trends</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {usageAnalytics?.borrowingTrends?.map((trend) => (
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
                              <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
                            )}
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div className="space-y-4">
                      {notifications.length === 0 ? (
                        <EmptyState
                          icon={<Bell className="h-16 w-16 mx-auto text-muted-foreground/50" />}
                          title="No notifications"
                          description="You're all caught up! We'll notify you about important updates here."
                        />
                      ) : (
                        notifications.map((notification) => (
                          <AnimatedCard key={notification.id} className={`bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${notification.isRead ? 'opacity-60' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{notification.title}</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                  {notification.actionUrl && (
                                    <AnimatedButton 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-3"
                                      onClick={() => window.location.href = notification.actionUrl!}
                                    >
                                      Take Action
                                    </AnimatedButton>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </AnimatedCard>
                        ))
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </div>

      {/* Confirmation Dialogs */}
      <ExtendDialog
        isOpen={extendDialog.isOpen}
        onClose={() => setExtendDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmExtendBorrowing}
        itemName={extendDialog.item?.item.name || ''}
        currentDueDate={extendDialog.item ? new Date(extendDialog.item.reservation.endDate).toLocaleDateString() : ''}
        newDueDate={extendDialog.item ? new Date(new Date(extendDialog.item.reservation.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : ''}
        loading={extendDialog.loading}
      />

      <ReturnDialog
        isOpen={returnDialog.isOpen}
        onClose={() => setReturnDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmReturnItem}
        itemName={returnDialog.item?.item.name || ''}
        borrowedDate={returnDialog.item ? new Date(returnDialog.item.reservation.startDate).toLocaleDateString() : ''}
        dueDate={returnDialog.item ? new Date(returnDialog.item.reservation.endDate).toLocaleDateString() : ''}
        isOverdue={returnDialog.item?.isOverdue || false}
        loading={returnDialog.loading}
      />

      <CancelDialog
        isOpen={cancelDialog.isOpen}
        onClose={() => setCancelDialog({ isOpen: false, item: null, loading: false })}
        onConfirm={confirmCancelReservation}
        itemName={cancelDialog.item?.item.name || ''}
        reservationDate={cancelDialog.item ? new Date(cancelDialog.item.reservation.createdAt || cancelDialog.item.reservation.startDate).toLocaleDateString() : ''}
        startDate={cancelDialog.item ? new Date(cancelDialog.item.reservation.startDate).toLocaleDateString() : ''}
        loading={cancelDialog.loading}
      />
    </div>
  )
}


// You are a skilled frontend developer with a strong background in creating clean and user-friendly web layouts. You are known for your attention to detail, ability to simplify complex designs, and expertise in enhancing navigation experiences. I want to redesign a page with contains coomponents layout for better clarity and navigation. This is what is happening with me: I am working on which makes it difficult for users to find what they need. I want a layout that i e.g., “minimalist, intuitive, and easy to navigate”) while avoiding excessive UI elements. I want you to provide a step-by-step redesign plan that includes:

// • A proposed layout structure for the application that ensures, “easy access to product categories”
// • Suggestions for navigation improvements, such as ropdown menus, breadcrumb trails
// • Best practices for optimizing the user experience across devices, including “mobile and desktop
// • Code snippets or examples for implementing the new layout in Next.js

// Use a concise and actionable tone. Ensure that the redesign focuses on enhancing usability while maintaining a visually appealing interface.