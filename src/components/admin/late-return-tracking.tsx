'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Clock, 
  AlertTriangle, 
  Mail, 
  Bell,
  User,
  Calendar,
  TrendingUp,
  Send,
  CheckSquare,
  Filter,
  RefreshCw
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

interface LateReturnTrackingProps {
  onClose: () => void
}

export default function LateReturnTracking({ onClose }: LateReturnTrackingProps) {
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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Late Return Tracking & Notifications</h1>
        <div className="flex gap-2">
          <Button onClick={fetchOverdueData} variant="outline" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Overdue</p>
                <p className="text-2xl font-bold">{analytics.totalOverdue}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Critical Items</p>
                <p className="text-2xl font-bold text-red-600">{analytics.bySeverity.critical}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Days Overdue</p>
                <p className="text-2xl font-bold">{analytics.averageDaysOverdue.toFixed(1)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Affected Users</p>
                <p className="text-2xl font-bold">{analytics.affectedUsers}</p>
              </div>
            </div>
          </Card>
        </div>
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

      {/* Notification Actions */}
      {selectedItems.size > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                Send notifications to {selectedItems.size} borrower(s)
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => sendNotifications('REMINDER')}
                disabled={notificationLoading}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Reminder
              </Button>
              <Button
                onClick={() => sendNotifications('WARNING')}
                disabled={notificationLoading}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Send Warning
              </Button>
              <Button
                onClick={() => sendNotifications('FINAL_NOTICE')}
                disabled={notificationLoading}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Final Notice
              </Button>
            </div>
          </div>
        </Card>
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
    </div>
  )
}