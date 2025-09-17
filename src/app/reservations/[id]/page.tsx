'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ReservationWithDetails {
  id: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  purpose?: string
  notes?: string
  createdAt: string
  updatedAt: string
  item: {
    id: string
    name: string
    category: string
    status: string
    images: string[]
    location?: string
    condition: string
  }
  user: {
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }
  returns?: Array<{
    id: string
    returnDate: string
    conditionOnReturn: string
    status: string
  }>
}

interface ReservationDetailPageProps {
  params: {
    id: string
  }
}

export default function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Fetch reservation details
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Reservation not found')
            router.push('/reservations')
            return
          }
          throw new Error('Failed to fetch reservation')
        }
        const { reservation } = await response.json()
        setReservation(reservation)
      } catch (error) {
        console.error('Error fetching reservation:', error)
        toast.error('Failed to load reservation details')
        router.push('/reservations')
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [params.id, router])

  // Check if user can manage this reservation
  const canManage = () => {
    if (!session?.user || !reservation) return false
    
    const isOwner = reservation.user.id === session.user.id
    const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')
    
    return isOwner || isAdmin
  }

  // Check if user can approve/reject
  const canApprove = () => {
    if (!session?.user) return false
    return ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')
  }

  // Update reservation status
  const updateReservationStatus = async (
    status: string, 
    rejectionReason?: string
  ) => {
    if (!reservation) return

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejectionReason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update reservation')
      }

      const { reservation: updatedReservation } = await response.json()
      setReservation(updatedReservation)
      setShowApprovalForm(false)
      setRejectionReason('')
      
      toast.success('Reservation updated successfully!')
    } catch (error) {
      console.error('Error updating reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update reservation')
    } finally {
      setUpdating(false)
    }
  }

  // Cancel reservation
  const cancelReservation = async () => {
    if (!reservation) return
    
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CANCELLED',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel reservation')
      }

      const { reservation: updatedReservation } = await response.json()
      setReservation(updatedReservation)
      
      toast.success('Reservation cancelled successfully!')
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel reservation')
    } finally {
      setUpdating(false)
    }
  }

  // Delete reservation
  const deleteReservation = async () => {
    if (!reservation) return
    
    if (!confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete reservation')
      }
      
      toast.success('Reservation deleted successfully!')
      router.push('/reservations')
    } catch (error) {
      console.error('Error deleting reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete reservation')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary'
      case 'APPROVED': return 'default'
      case 'ACTIVE': return 'default'
      case 'COMPLETED': return 'outline'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Reservation Not Found</h1>
          <p className="text-gray-600 mb-6">
            The reservation you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push('/reservations')}>
            Back to Reservations
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          ← Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reservation Details</h1>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(reservation.status)}>
                {reservation.status}
              </Badge>
              <span className="text-gray-600">
                Created {new Date(reservation.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          {canManage() && (
            <div className="flex gap-2">
              {canApprove() && reservation.status === 'PENDING' && (
                <>
                  <Button
                    onClick={() => updateReservationStatus('APPROVED')}
                    disabled={updating}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowApprovalForm(true)}
                    disabled={updating}
                  >
                    Reject
                  </Button>
                </>
              )}
              
              {['PENDING', 'APPROVED'].includes(reservation.status) && (
                <Button
                  variant="outline"
                  onClick={cancelReservation}
                  disabled={updating}
                >
                  Cancel
                </Button>
              )}
              
              {canApprove() && ['CANCELLED', 'REJECTED'].includes(reservation.status) && (
                <Button
                  variant="destructive"
                  onClick={deleteReservation}
                  disabled={updating}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservation Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Reservation Information</h2>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Item</Label>
              <div className="mt-1">
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium"
                  onClick={() => router.push(`/items/${reservation.item.id}`)}
                >
                  {reservation.item.name}
                </Button>
                <p className="text-sm text-gray-600">{reservation.item.category}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Reserved by</Label>
              <p className="mt-1">{reservation.user.name} ({reservation.user.email})</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Reservation Period</Label>
              <p className="mt-1">
                {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                {new Date(reservation.endDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Duration: {Math.ceil(
                  (new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime()) 
                  / (1000 * 60 * 60 * 24)
                )} days
              </p>
            </div>

            {reservation.purpose && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Purpose</Label>
                <p className="mt-1">{reservation.purpose}</p>
              </div>
            )}

            {reservation.notes && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Notes</Label>
                <p className="mt-1">{reservation.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Item Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Item Information</h2>
          
          <div className="space-y-4">
            {reservation.item.images.length > 0 && (
              <div>
                <Image
                  src={reservation.item.images[0]}
                  alt={reservation.item.name}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-500">Status</Label>
              <div className="mt-1">
                <Badge variant={
                  reservation.item.status === 'AVAILABLE' ? 'default' :
                  reservation.item.status === 'RESERVED' ? 'secondary' :
                  'outline'
                }>
                  {reservation.item.status}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Condition</Label>
              <p className="mt-1">{reservation.item.condition}</p>
            </div>

            {reservation.item.location && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Location</Label>
                <p className="mt-1">{reservation.item.location}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Rejection Form Modal */}
      {showApprovalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Reservation</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectionReason">Reason for rejection</Label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mt-1"
                  placeholder="Please provide a reason for rejecting this reservation..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalForm(false)
                    setRejectionReason('')
                  }}
                  disabled={updating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => updateReservationStatus('REJECTED', rejectionReason)}
                  disabled={updating || !rejectionReason.trim()}
                  className="flex-1"
                >
                  {updating ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}