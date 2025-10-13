'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import {
  Clock,
  AlertTriangle,
  User,
  RefreshCw,
  Filter,
  CheckSquare,
  Bell,
  Mail,
  Send,
  TrendingUp,
  Settings,
  XCircle,
  Calendar
} from 'lucide-react'

interface OverdueReservation {
  id: string
  endDate: string
  daysOverdue: number
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL'
  potentialPenalty: number
  notificationCount: number
  lastNotificationSent: string | null
  item: {
    id: string
    name: string
    condition: string
    category: string
    value: number
  }
  user: {
    id: string
    name: string
    email: string
    trustScore: number
  }
}

interface OverdueAnalytics {
  totalOverdue: number
  bySeverity: {
    moderate: number
    high: number
    critical: number
  }
  averageDaysOverdue: number
  totalPotentialPenalty: number
  affectedUsers: number
  topOverdueItems: {
    itemId: string
    itemName: string
    daysOverdue: number
    borrowerName: string
  }[]
}


export default function LateReturnTracking() {
  const [loading, setLoading] = useState(true)
  const [overdueReservations, setOverdueReservations] = useState<OverdueReservation[]>([])
  const [analytics, setAnalytics] = useState<OverdueAnalytics | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'MODERATE' | 'HIGH' | 'CRITICAL'>('ALL')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          severity: severityFilter,
          limit: '50'
        })
        
        const response = await fetch(`/api/returns/overdue?${params}`)
        if (response.ok) {
          const data = await response.json()
          setOverdueReservations(data.overdueReservations)
          setAnalytics(data.analytics)
        } else {
          console.error('Failed to fetch overdue data')
        }
      } catch (error) {
        console.error('Error fetching overdue data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [severityFilter])

  const fetchOverdueData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        severity: severityFilter,
        limit: '50'
      })
      
      const response = await fetch(`/api/returns/overdue?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOverdueReservations(data.overdueReservations)
        setAnalytics(data.analytics)
      } else {
        console.error('Failed to fetch overdue data')
      }
    } catch (error) {
      console.error('Error fetching overdue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (reservationId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(reservationId)) {
      newSelected.delete(reservationId)
    } else {
      newSelected.add(reservationId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === overdueReservations.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(overdueReservations.map(r => r.id)))
    }
  }

  const sendNotifications = async (notificationType: 'REMINDER' | 'WARNING' | 'FINAL_NOTICE') => {
    if (selectedItems.size === 0) {
      alert('Please select at least one overdue reservation')
      return
    }

    try {
      setNotificationLoading(true)
      const response = await fetch('/api/returns/overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationIds: Array.from(selectedItems),
          notificationType,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully sent ${notificationType.toLowerCase()} notifications to ${result.notifications.length} borrowers`)
        setSelectedItems(new Set())
        fetchOverdueData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Error sending notifications: ${error.error}`)
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      alert('Error sending notifications')
    } finally {
      setNotificationLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <motion.div 
        className="p-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div
            variants={staggerContainer}
            className="p-6 space-y-6"
          >
            <motion.div variants={fadeInUp} className="h-8 bg-muted/30 rounded-xl w-1/3 animate-pulse" />
            <motion.div variants={fadeInUp} className="h-32 bg-muted/30 rounded-xl animate-pulse" />
            <motion.div variants={fadeInUp} className="h-64 bg-muted/30 rounded-xl animate-pulse" />
          </motion.div>
        </AnimatedCard>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
        <motion.div variants={fadeInUp} className="p-6 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-orange-400/10 backdrop-blur-sm rounded-xl border border-orange-500/20">
                <Settings className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Late Return Tracking & Notifications
                </h1>
                <p className="text-muted-foreground">
                  Monitor overdue items and send automated notifications
                </p>
              </div>
            </div>
           
          </div>
        </motion.div>
      </AnimatedCard>

      {/* Enhanced Analytics Overview */}
      {analytics && (
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatedCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalOverdue}</p>
              </div>
            </div>
          </AnimatedCard>
          
          <AnimatedCard className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-200/50 dark:border-red-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.bySeverity.critical}</p>
              </div>
            </div>
          </AnimatedCard>
          
          <AnimatedCard className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200/50 dark:border-purple-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Days Overdue</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.averageDaysOverdue.toFixed(1)}</p>
              </div>
            </div>
          </AnimatedCard>
          
          <AnimatedCard className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affected Users</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.affectedUsers}</p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Severity Filter */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Severity:
            </Label>
            <div className="flex gap-2">
              {['ALL', 'MODERATE', 'HIGH', 'CRITICAL'].map((severity) => (
                <button
                  key={severity}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    severityFilter === severity
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setSeverityFilter(severity as typeof severityFilter)}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              disabled={overdueReservations.length === 0}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectedItems.size === overdueReservations.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <span className="text-sm text-gray-600">
              {selectedItems.size} selected
            </span>
          </div>
        </div>
      </Card>

      {/* Enhanced Notification Actions */}
      {selectedItems.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <AnimatedCard className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Send notifications to {selectedItems.size} borrower(s)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose the appropriate notification type based on overdue severity
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <AnimatedButton
                  onClick={() => sendNotifications('REMINDER')}
                  disabled={notificationLoading}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => sendNotifications('WARNING')}
                  disabled={notificationLoading}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Send Warning
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => sendNotifications('FINAL_NOTICE')}
                  disabled={notificationLoading}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Final Notice
                </AnimatedButton>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* Overdue Items List */}
      {overdueReservations.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No overdue returns found</p>
            <p className="text-sm">
              {severityFilter === 'ALL' ? 'All items have been returned on time' : `No ${severityFilter.toLowerCase()} overdue returns`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {overdueReservations.map((reservation) => (
            <Card key={reservation.id} className="p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(reservation.id)}
                  onChange={() => handleSelectItem(reservation.id)}
                  className="mt-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{reservation.item.name}</h3>
                      <p className="text-sm text-gray-600">{reservation.item.category}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge className={getSeverityColor(reservation.severity)}>
                        {reservation.severity}
                      </Badge>
                      <Badge variant="outline" className="text-red-600 border-red-500">
                        {reservation.daysOverdue} days overdue
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Borrower</Label>
                      <p className="font-medium">{reservation.user.name}</p>
                      <p className="text-sm text-gray-600">{reservation.user.email}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Due Date</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(reservation.endDate)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Trust Score Impact</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-red-600">
                          -{reservation.potentialPenalty.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600">points</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Notifications Sent</Label>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{reservation.notificationCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {reservation.lastNotificationSent && (
                    <div className="text-sm text-gray-600">
                      Last notification: {formatDate(reservation.lastNotificationSent)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Top Overdue Items Summary */}
      {analytics && analytics.topOverdueItems.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Overdue Items</h3>
          <div className="space-y-2">
            {analytics.topOverdueItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{item.itemName}</span>
                  <span className="text-sm text-gray-600 ml-2">by {item.borrowerName}</span>
                </div>
                <Badge variant="outline" className="text-red-600 border-red-500">
                  {item.daysOverdue} days overdue
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  )
}