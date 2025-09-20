'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/auth-context'
import ReputationDisplay from '@/components/profile/reputation-display'
import { Breadcrumb } from '@/components/navigation/breadcrumb'
import { DropdownMenu, MobileMenu } from '@/components/navigation/dropdown-menu'
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
  RefreshCw,
  Search,
  Calendar,
  User,
  Settings,
  ArrowRight,
  Clock
} from 'lucide-react'
import { Item, Reservation } from '@prisma/client'
import { ThemeToggle } from '../theme/theme-toggle'

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

export default function BorrowingDashboard() {
  const { user } = useAuth()
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [extendDialog, setExtendDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [returnDialog, setReturnDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; item: BorrowedItem | null; loading: boolean }>({ isOpen: false, item: null, loading: false })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [statsRes, itemsRes] = await Promise.all([
        fetch('/api/user/borrowing-stats'),
        fetch('/api/user/borrowed-items')
      ])

      if (statsRes.ok) {
        const stats = await statsRes.json()
        setDashboardStats(stats)
      }

      if (itemsRes.ok) {
        const items = await itemsRes.json()
        setBorrowedItems(items.items || [])
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

                <ThemeToggle />
                
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

          {/* Main Content */}
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden">
              <div className="p-8">
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-8"
                >
           
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
                              <Link href="/dashboard/my-items">
                                <AnimatedButton variant="outline" size="sm">
                                  View All <ArrowRight className="h-4 w-4 ml-1" />
                                </AnimatedButton>
                              </Link>
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