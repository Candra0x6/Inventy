'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Calendar, 
  User, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Reservations</p>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={refetchReservations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Reservation Management</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={refetchReservations} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
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
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'startDate' | 'status')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="createdAt">Created Date</option>
                <option value="startDate">Start Date</option>
                <option value="status">Status</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedReservations.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedReservations.length} selected
              </span>
              <Button
                size="sm"
                onClick={() => handleBulkAction('approve')}
                disabled={processingBulk}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('reject')}
                disabled={processingBulk}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('cancel')}
                disabled={processingBulk}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('delete')}
                disabled={processingBulk}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
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
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reservation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservations?.map((reservation) => (
              <tr key={reservation.id} className="hover:bg-gray-50">
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
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{reservation.purpose}</p>
                      <p className="text-sm text-gray-500">
                        Created {format(new Date(reservation.createdAt), 'MMM dd, yyyy')}
                      </p>
                      {reservation.notes && (
                        <p className="text-sm text-gray-600 mt-1">{reservation.notes}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{reservation.user.name}</p>
                      <p className="text-sm text-gray-500">{reservation.user.email}</p>
                      {reservation.contactInfo && (
                        <p className="text-sm text-gray-600">{reservation.contactInfo}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{reservation.item.name}</p>
                      <p className="text-sm text-gray-500">
                        {reservation.item.code} • {reservation.item.category.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {format(new Date(reservation.startDate), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-gray-500">to</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(reservation.endDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(reservation.status)}
                    <Badge variant={getStatusBadgeVariant(reservation.status)}>
                      {reservation.status}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {reservation.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSingleAction(reservation.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSingleAction(reservation.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {(reservation.status === 'APPROVED' || reservation.status === 'PENDING') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSingleAction(reservation.id, 'cancel')}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reservations.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No reservations found</p>
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? 'No reservations have been created yet.' 
              : `No reservations with status "${statusFilter}".`
            }
          </p>
        </div>
      )}
    </div>
  )
}