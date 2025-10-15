'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ReservationCalendar } from '@/components/reservations/reservation-calendar'
import { ReservationForm } from '@/components/reservations/reservation-form'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import { toast } from 'sonner'
import { ArrowLeft, Eye, Calendar, Clock, User, FileText } from 'lucide-react'
import Link from 'next/link'

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items/${itemId}`)
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


  console.log(selectedReservation)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/reservations`, {
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto p-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto"
        >
          {/* Header Skeleton */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="h-4 bg-muted/50 rounded-xl w-48 mb-6 animate-pulse" />
            <div className="h-10 bg-muted/50 rounded-xl w-64 mb-4 animate-pulse" />
            <div className="flex gap-3 mb-4">
              <div className="h-8 bg-muted/50 rounded-xl w-24 animate-pulse" />
              <div className="h-8 bg-muted/50 rounded-xl w-28 animate-pulse" />
            </div>
            <div className="h-5 bg-muted/50 rounded-xl w-96 animate-pulse" />
          </motion.div>
          
          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div variants={fadeInUp}>
              <AnimatedCard className="p-8">
                <div className="h-6 bg-muted/50 rounded-xl w-48 mb-6 animate-pulse" />
                <div className="h-80 bg-muted/30 rounded-2xl animate-pulse" />
              </AnimatedCard>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <AnimatedCard className="p-8">
                <div className="h-6 bg-muted/50 rounded-xl w-32 mb-6 animate-pulse" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              </AnimatedCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="text-center py-16">
            <AnimatedCard className="p-12 max-w-md mx-auto">
              <div className="text-6xl opacity-20 mb-6">📦</div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Item Not Found
              </h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                The item you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <AnimatedButton asChild>
                <Link href="/items">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Items
                </Link>
              </AnimatedButton>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 max-w-5xl mx-auto p-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Breadcrumb Navigation */}
        <motion.nav 
          variants={fadeInUp}
          className="flex items-center space-x-3 text-sm text-muted-foreground mb-8"
        >
          <AnimatedButton variant="ghost" size="sm" asChild>
            <Link href="/items" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Items
            </Link>
          </AnimatedButton>
          <span className="text-border">•</span>
          <AnimatedButton variant="ghost" size="sm" asChild>
            <Link href={`/items/${item.id}`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </Link>
          </AnimatedButton>
        </motion.nav>

        {/* Header Section */}
        <motion.div variants={fadeInUp} className="mb-12">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                Reserve Item
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-2xl text-muted-foreground font-medium">{item.name}</h2>
                <Badge 
                  variant="outline"
                  className={`font-medium shadow-sm ${
                    item.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                    item.status === 'RESERVED' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' :
                    item.status === 'BORROWED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
                    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {item.status}
                  </div>
                </Badge>
              </div>
              {item.description && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl bg-muted/30 p-6 rounded-xl border border-border/30">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <motion.div variants={fadeInUp}>
            <ReservationCalendar
              itemId={item.id}
              onDateSelect={handleDateSelect}
              onReservationSelect={handleReservationSelect}
              selectedRange={selectedDates ? {
                start: selectedDates.start,
                end: selectedDates.end || selectedDates.start
              } : undefined}
            />
          </motion.div>

          {/* Form or Reservation Details */}
          <motion.div variants={fadeInUp}>
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
              <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  Reservation Details
                </h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Status
                    </div>
                    <div>
                      <Badge 
                        variant="outline"
                        className={`font-medium shadow-sm ${
                          selectedReservation.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                          selectedReservation.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' :
                          selectedReservation.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
                          'bg-muted text-muted-foreground border-muted'
                        }`}
                      >
                        {selectedReservation.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      Reserved by
                    </div>
                    <p className="text-foreground font-medium">{selectedReservation.user.name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Period
                    </div>
                    <p className="text-foreground font-medium">
                      {new Date(selectedReservation.startDate).toLocaleDateString()} - {' '}
                      {new Date(selectedReservation.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  {selectedReservation.purpose && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Purpose
                      </div>
                      <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/30">
                        {selectedReservation.purpose}
                      </p>
                    </div>
                  )}

                  {selectedReservation.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Notes
                      </div>
                      <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/30">
                        {selectedReservation.notes}
                      </p>
                    </div>
                  )}

                  {/* Action buttons for reservation owner or admin */}
                  {(session?.user?.id === selectedReservation.user.id || 
                    ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session?.user?.role || '')) && (
                    <div className="pt-6 border-t border-border/30">
                      <AnimatedButton variant="outline" asChild>
                        <Link href={`/reservations/${selectedReservation.id}`}>
                          Manage Reservation
                        </Link>
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            ) : (
              <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
                <div className="text-center space-y-6">
                  <div className="text-6xl opacity-20">📅</div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold">Select Dates</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Click on available dates in the calendar to start making a reservation, 
                      or click on existing reservations to view details.
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>
                      <span className="text-muted-foreground">Available for booking</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                      <span className="text-muted-foreground">Pending reservations</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span className="text-muted-foreground">Approved/active reservations</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-3 h-3 bg-muted border border-border rounded"></div>
                      <span className="text-muted-foreground">Unavailable</span>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}