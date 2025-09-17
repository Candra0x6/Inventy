'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ReservationCalendar } from '@/components/reservations/reservation-calendar'
import { ReservationForm } from '@/components/reservations/reservation-form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Item {
  id: string
  name: string
  description?: string
  category: string
  status: string
  images: string[]
  location?: string
  condition: string
}

interface Reservation {
  id: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  purpose?: string
  notes?: string
  user: {
    id: string
    name: string
  }
}

export default function ReservationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('itemId')

  const [item, setItem] = useState<Item | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedDates, setSelectedDates] = useState<{
    start: Date
    end?: Date
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Fetch item details
  useEffect(() => {
    if (!itemId) {
      router.push('/items')
      return
    }

    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/items/${itemId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch item')
        }
        const item = await response.json()
        setItem(item)
      } catch (error) {
        console.error('Error fetching item:', error)
        toast.error('Failed to load item details')
        router.push('/items')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [itemId, router])

  // Handle date selection from calendar
  const handleDateSelect = (startDate: Date, endDate?: Date) => {
    setSelectedDates({
      start: startDate,
      end: endDate || startDate
    })
    setShowForm(true)
    setSelectedReservation(null)
  }

  // Handle reservation selection from calendar
  const handleReservationSelect = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setShowForm(false)
    setSelectedDates(null)
  }

  // Handle form submission
  const handleFormSubmit = async (formData: {
    startDate: string
    endDate: string
    purpose?: string
    notes?: string
  }) => {
    if (!itemId) return

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          ...formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reservation')
      }

      await response.json()
      
      toast.success('Reservation created successfully!')
      setShowForm(false)
      setSelectedDates(null)
      
      // Refresh the calendar to show new reservation
      window.location.reload()
    } catch (error) {
      console.error('Error creating reservation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false)
    setSelectedDates(null)
  }

  // Format date for input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Item Not Found</h1>
          <p className="text-gray-600 mb-6">
            The item you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push('/items')}>
            Back to Items
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/items')}
          >
            ← Back to Items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/items/${item.id}`)}
          >
            View Item Details
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Reserve Item</h1>
        <div className="flex items-center gap-4">
          <h2 className="text-xl text-gray-600">{item.name}</h2>
          <Badge variant={
            item.status === 'AVAILABLE' ? 'default' :
            item.status === 'RESERVED' ? 'secondary' :
            item.status === 'BORROWED' ? 'outline' :
            'destructive'
          }>
            {item.status}
          </Badge>
        </div>
        {item.description && (
          <p className="text-gray-600 mt-2">{item.description}</p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <ReservationCalendar
            itemId={item.id}
            onDateSelect={handleDateSelect}
            onReservationSelect={handleReservationSelect}
            selectedRange={selectedDates ? {
              start: selectedDates.start,
              end: selectedDates.end || selectedDates.start
            } : undefined}
          />
        </div>

        {/* Form or Reservation Details */}
        <div>
          {showForm && selectedDates ? (
            <ReservationForm
              itemId={item.id}
              itemName={item.name}
              initialStartDate={formatDateForInput(selectedDates.start)}
              initialEndDate={formatDateForInput(selectedDates.end || selectedDates.start)}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isSubmitting={submitting}
            />
          ) : selectedReservation ? (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reservation Details</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedReservation.status === 'APPROVED' ? 'default' :
                      selectedReservation.status === 'PENDING' ? 'secondary' :
                      selectedReservation.status === 'ACTIVE' ? 'default' :
                      'outline'
                    }>
                      {selectedReservation.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Reserved by</Label>
                  <p className="mt-1">{selectedReservation.user.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Period</Label>
                  <p className="mt-1">
                    {new Date(selectedReservation.startDate).toLocaleDateString()} - {' '}
                    {new Date(selectedReservation.endDate).toLocaleDateString()}
                  </p>
                </div>

                {selectedReservation.purpose && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Purpose</Label>
                    <p className="mt-1">{selectedReservation.purpose}</p>
                  </div>
                )}

                {selectedReservation.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Notes</Label>
                    <p className="mt-1">{selectedReservation.notes}</p>
                  </div>
                )}

                {/* Action buttons for reservation owner or admin */}
                {(session?.user?.id === selectedReservation.user.id || 
                  ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session?.user?.role || '')) && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/reservations/${selectedReservation.id}`)}
                    >
                      Manage Reservation
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Select Dates</h3>
                <p className="text-gray-600 mb-4">
                  Click on available dates in the calendar to start making a reservation, 
                  or click on existing reservations to view details.
                </p>
                
                <div className="space-y-2 text-sm text-gray-500">
                  <p>• Green dates are available for booking</p>
                  <p>• Yellow dates have pending reservations</p>
                  <p>• Blue dates are approved/active reservations</p>
                  <p>• Gray dates are unavailable</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {children}
    </label>
  )
}