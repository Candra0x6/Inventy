'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  Calendar, 
  User, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  Search,
  Settings,
  Eye
} from 'lucide-react'

interface Reservation {
  id: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
  purpose: string
  contactInfo?: string
  notes?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  item: {
    id: string
    name: string
    code: string
    category: {
      name: string
    }
  }
}

interface ReservationManagementTableProps {
  className?: string
}

export default function ReservationManagementTable({ className }: ReservationManagementTableProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReservations, setSelectedReservations] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'startDate' | 'status'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [processingBulk, setProcessingBulk] = useState(false)

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          ...(statusFilter !== 'all' && { status: statusFilter }),
          sortBy,
          sortOrder
        })
        
        const response = await fetch(`/api/reservations?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch reservations')
        }
        
        const data = await response.json()
        setReservations(data.reservations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reservations')
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [statusFilter, sortBy, sortOrder])

  const refetchReservations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy,
        sortOrder
      })
      
      const response = await fetch(`/api/reservations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch reservations')
      }
      
      const data = await response.json()
      setReservations(data.reservations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'cancel' | 'delete') => {
    if (selectedReservations.length === 0) return

    try {
      setProcessingBulk(true)
      const response = await fetch('/api/admin/reservations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationIds: selectedReservations,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} reservations`)
      }

      const result = await response.json()
      
      // Refresh the table
      await refetchReservations()
      setSelectedReservations([])
      
      // Show success message (you might want to use a toast library)
      alert(`Successfully ${action}ed ${result.successful} reservations`)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} reservations`)
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleSingleAction = async (reservationId: string, action: 'approve' | 'reject' | 'cancel') => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action === 'approve' ? 'ACTIVE' : action === 'reject' ? 'REJECTED' : 'CANCELLED',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} reservation`)
      }

      // Refresh the table
      await refetchReservations()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} reservation`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'APPROVED':
        return 'default'
      case 'REJECTED':
        return 'destructive'
      case 'CANCELLED':
        return 'outline'
      case 'COMPLETED':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="p-6 space-y-6"
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="h-8 bg-muted/50 rounded-xl w-80 animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 bg-muted/30 rounded-xl w-32 animate-pulse" />
                  <div className="h-10 bg-muted/30 rounded-xl w-40 animate-pulse" />
                </div>
                <div className="flex space-x-2">
                  <div className="h-10 bg-muted/30 rounded-xl w-24 animate-pulse" />
                  <div className="h-10 bg-muted/30 rounded-xl w-20 animate-pulse" />
                </div>
              </div>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </motion.div>
          </motion.div>
        </AnimatedCard>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center text-destructive"
          >
            <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Reservations</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <AnimatedButton onClick={refetchReservations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </AnimatedButton>
          </motion.div>
        </AnimatedCard>
      </div>
    )
  }

  return (
    <motion.div 
      className={`space-y-6 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
        {/* Enhanced Header */}
        <motion.div variants={fadeInUp} className="p-6 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Reservation Management
                </h2>
                <p className="text-muted-foreground">
                  Review and manage all reservation requests
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AnimatedButton onClick={refetchReservations} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </AnimatedButton>
              <AnimatedButton variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </AnimatedButton>
            </div>
          </div>

          {/* Enhanced Filters and Bulk Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'startDate' | 'status')}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="startDate">Start Date</option>
                  <option value="status">Status</option>
                </select>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </AnimatedButton>
              </div>
            </div>

            {/* Enhanced Bulk Actions */}
            {selectedReservations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-3 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20"
              >
                <Badge className="bg-primary text-primary-foreground">
                  {selectedReservations.length} selected
                </Badge>
                <AnimatedButton
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  disabled={processingBulk}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </AnimatedButton>
                <AnimatedButton
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('reject')}
                  disabled={processingBulk}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </AnimatedButton>
                <AnimatedButton
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('cancel')}
                  disabled={processingBulk}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Cancel
                </AnimatedButton>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Table */}
        <motion.div variants={fadeInUp} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedReservations.length === reservations.length && reservations.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReservations(reservations.map(r => r.id))
                        } else {
                          setSelectedReservations([])
                        }
                      }}
                      className="rounded border-border focus:ring-primary/20 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Reservation Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    User Information
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Item Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {reservations?.map((reservation, index) => (
                  <motion.tr 
                    key={reservation.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/20 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedReservations.includes(reservation.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReservations([...selectedReservations, reservation.id])
                          } else {
                            setSelectedReservations(selectedReservations.filter(id => id !== reservation.id))
                          }
                        }}
                        className="rounded border-border focus:ring-primary/20 focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{reservation.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(reservation.createdAt), 'MMM dd, yyyy')}
                          </p>
                          {reservation.notes && (
                            <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted/20 rounded-md">
                              {reservation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-lg">
                          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{reservation.user.name}</p>
                          <p className="text-xs text-muted-foreground">{reservation.user.email}</p>
                          {reservation.contactInfo && (
                            <p className="text-xs text-muted-foreground">{reservation.contactInfo}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg">
                          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{reservation.item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.item.code} • {reservation.item.category.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">From:</span>
                          <span>{format(new Date(reservation.startDate), 'MMM dd')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">To:</span>
                          <span>{format(new Date(reservation.endDate), 'MMM dd')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(reservation.status)}
                        <Badge variant={getStatusBadgeVariant(reservation.status)} className="text-xs">
                          {reservation.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {reservation.status === 'PENDING' && (
                          <>
                            <AnimatedButton
                              size="sm"
                              onClick={() => handleSingleAction(reservation.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </AnimatedButton>
                            <AnimatedButton
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSingleAction(reservation.id, 'reject')}
                              className="h-8 px-3 text-xs"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </AnimatedButton>
                          </>
                        )}
                        {(reservation.status === 'APPROVED' || reservation.status === 'PENDING') && (
                          <AnimatedButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleSingleAction(reservation.id, 'cancel')}
                            className="h-8 px-3 text-xs"
                          >
                            Cancel
                          </AnimatedButton>
                        )}
                        <AnimatedButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-3 w-3" />
                        </AnimatedButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Enhanced Empty State */}
        {reservations.length === 0 && (
          <motion.div 
            variants={fadeInUp}
            className="text-center py-16"
          >
            <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reservations found</h3>
            <p className="text-muted-foreground mb-6">
              {statusFilter === 'all' 
                ? 'No reservations have been created yet.' 
                : `No reservations with status "${statusFilter}".`
              }
            </p>
            <AnimatedButton variant="outline" onClick={() => setStatusFilter('all')}>
              <Search className="h-4 w-4 mr-2" />
              Show All Reservations
            </AnimatedButton>
          </motion.div>
        )}
      </AnimatedCard>
    </motion.div>
  )
}