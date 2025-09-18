'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Calendar from 'react-calendar'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ToggleRight,
  AlertTriangle,
  X
} from 'lucide-react'
import 'react-calendar/dist/Calendar.css'

interface Reservation {
  id: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  purpose?: string
  user: {
    id: string
    name: string
  }
}

interface Item {
  id: string
  name: string
  status: string
}

interface ReservationCalendarProps {
  itemId: string
  onDateSelect?: (startDate: Date, endDate?: Date) => void
  onReservationSelect?: (reservation: Reservation) => void
  selectedRange?: {
    start: Date
    end: Date
  }
  className?: string
}

interface CalendarData {
  item: Item
  reservations: Reservation[]
}

type ValuePiece = Date | null
type Value = ValuePiece | [ValuePiece, ValuePiece]

export function ReservationCalendar({
  itemId,
  onDateSelect,
  onReservationSelect,
  className = '',
}: ReservationCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [selectedDate, setSelectedDate] = useState<Value>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRangeSelection, setIsRangeSelection] = useState(false)

  // Format date for API calls
  const formatMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  // Fetch reservations for the current month
  const fetchReservations = useCallback(async (month: Date) => {
    try {
      setLoading(true)
      setError(null)
      
      const monthStr = formatMonth(month)
      const response = await fetch(
        `/api/reservations/availability?itemId=${itemId}&month=${monthStr}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations')
      }
      const data: CalendarData = await response.json()
      console.log(data)
      setCalendarData(data)
    } catch (err) {
      console.error('Error fetching reservations:', err)
      setError('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    fetchReservations(currentMonth)
  }, [currentMonth, fetchReservations])

  // Get reservation status for a specific date
  const getDateReservations = (date: Date): Reservation[] => {
    if (!calendarData?.reservations) return []
    
    return calendarData.reservations.filter((reservation) => {
      const startDate = new Date(reservation.startDate)
      const endDate = new Date(reservation.endDate)
      
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      
      return date >= startDate && date <= endDate
    })
  }

  // Get CSS class for calendar tile based on reservation status
  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const reservations = getDateReservations(date)
    if (reservations.length === 0) return 'available'
    
    // Priority: active > approved > pending > other
    const activeReservation = reservations.find(r => r.status === 'ACTIVE')
    if (activeReservation) return 'active'
    
    const approvedReservation = reservations.find(r => r.status === 'APPROVED')
    if (approvedReservation) return 'approved'
    
    const pendingReservation = reservations.find(r => r.status === 'PENDING')
    if (pendingReservation) return 'pending'
    
    return 'unavailable'
  }

  // Handle date click
  const handleDateClick = (value: Value) => {
    setSelectedDate(value)
    
    if (onDateSelect) {
      if (Array.isArray(value) && value[0] && value[1]) {
        onDateSelect(value[0], value[1])
      } else if (!Array.isArray(value) && value) {
        onDateSelect(value)
      }
    }
  }

  // Handle month navigation
  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      setCurrentMonth(activeStartDate)
    }
  }

  // Check if reservation is disabled for selected date
  const isReservationDisabled = () => {
    if (!selectedDate) return true
    
    if (Array.isArray(selectedDate)) {
      return !selectedDate[0] || !selectedDate[1]
    }
    
    const reservations = getDateReservations(selectedDate)
    return reservations.some(r => ['ACTIVE', 'APPROVED'].includes(r.status))
  }

  if (loading) {
    return (
      <AnimatedCard className={`p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeInUp} className="space-y-3">
            <div className="h-6 bg-muted/50 rounded-xl w-3/4 animate-pulse" />
            <div className="h-4 bg-muted/30 rounded-xl w-full animate-pulse" />
          </motion.div>
          <motion.div variants={fadeInUp} className="h-80 bg-muted/30 rounded-2xl animate-pulse" />
        </motion.div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard className={`p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center space-y-6"
        >
          <motion.div variants={fadeInUp} className="text-6xl opacity-20">
            <AlertTriangle className="h-16 w-16 mx-auto" />
          </motion.div>
          <motion.div variants={fadeInUp} className="space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <AnimatedButton onClick={() => fetchReservations(currentMonth)}>
              Try Again
            </AnimatedButton>
          </motion.div>
        </motion.div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard className={`p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold flex items-center gap-3">
                <CalendarIcon className="h-6 w-6 text-primary" />
                {calendarData?.item.name} Calendar
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Select dates to make a reservation or click on existing reservations for details
              </p>
            </div>
            
            <div className="flex gap-3">
              <AnimatedButton
                variant={isRangeSelection ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRangeSelection(!isRangeSelection)}
              >
                <ToggleRight className="h-4 w-4 mr-2" />
                {isRangeSelection ? 'Range' : 'Single'}
              </AnimatedButton>
            </div>
          </div>

          {/* Legend */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded-lg"></div>
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded-lg"></div>
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded-lg"></div>
              <span className="text-muted-foreground">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-lg"></div>
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted border border-border rounded-lg"></div>
              <span className="text-muted-foreground">Unavailable</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Calendar */}
        <motion.div variants={fadeInUp} className="calendar-container">
          <div className="bg-background/50 rounded-2xl border border-border/30 p-6">
            <Calendar
              onChange={handleDateClick}
              onActiveStartDateChange={handleActiveStartDateChange}
              value={selectedDate}
              selectRange={isRangeSelection}
              tileClassName={getTileClassName}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
              className="w-full border-0"
            />
          </div>
        </motion.div>

        {/* Selected Date Actions */}
        {/* {selectedDate && (
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Selected Date
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {isRangeSelection && Array.isArray(selectedDate) 
                      ? `${selectedDate[0]?.toLocaleDateString()} - ${selectedDate[1]?.toLocaleDateString()}`
                      : !Array.isArray(selectedDate) && selectedDate?.toLocaleDateString()
                    }
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </AnimatedButton>
                  
                  {!isReservationDisabled() && (
                    <AnimatedButton
                      onClick={() => onDateSelect?.(selectedDate as Date)}
                      size="sm"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Make Reservation
                    </AnimatedButton>
                  )}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        )} */}

        {/* Reservations List */}
        {calendarData?.reservations && calendarData.reservations.length > 0 && (
          <motion.div variants={fadeInUp}>
            <AnimatedCard className="p-6 bg-background/50 backdrop-blur-sm border border-border/50">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Current Month Reservations</h4>
                  <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {calendarData.reservations.length} reservation{calendarData.reservations.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {calendarData.reservations
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map((reservation, index) => (
                    <motion.div
                                      onClick={() => onReservationSelect?.(reservation)}

                      key={reservation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AnimatedCard className="p-4 bg-gradient-to-r from-background to-muted/20 border border-border/30">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                reservation.status === 'ACTIVE' ? 'bg-green-500' :
                                reservation.status === 'APPROVED' ? 'bg-blue-500' :
                                reservation.status === 'PENDING' ? 'bg-amber-500' :
                                reservation.status === 'COMPLETED' ? 'bg-gray-500' :
                                'bg-red-500'
                              }`}></div>
                              <span className="font-medium text-sm">
                                {reservation.status.replace('_', ' ')}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                by {reservation.user.name}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                                  {new Date(reservation.endDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            {reservation.purpose && (
                              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                <span className="font-medium">Purpose:</span> {reservation.purpose}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            {reservation.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <AnimatedButton size="sm" variant="outline">
                                  View Details
                                </AnimatedButton>
                              </div>
                            )}
                            {(reservation.status === 'APPROVED' || reservation.status === 'ACTIVE') && (
                              <AnimatedButton size="sm" variant="outline">
                                Manage
                              </AnimatedButton>
                            )}
                          </div>
                        </div>
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        )}
      </motion.div>

      <style jsx>{`
        .calendar-container :global(.react-calendar) {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
          font-size: 0.875rem;
        }
        
        .calendar-container :global(.react-calendar__navigation) {
          display: flex;
          height: 3rem;
          margin-bottom: 1.5rem;
          background: hsl(var(--background) / 0.5);
          border-radius: 12px;
          border: 1px solid hsl(var(--border) / 0.3);
          backdrop-filter: blur(8px);
        }
        
        .calendar-container :global(.react-calendar__navigation button) {
          min-width: 2.75rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: hsl(var(--foreground));
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          margin: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .calendar-container :global(.react-calendar__navigation button:hover) {
          background: hsl(var(--muted) / 0.8);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px hsl(var(--foreground) / 0.1);
        }
        
        .calendar-container :global(.react-calendar__navigation__label) {
          flex-grow: 1;
          font-weight: 600;
          font-size: 1rem;
          color: hsl(var(--foreground));
        }
        
        .calendar-container :global(.react-calendar__month-view__weekdays) {
          text-align: center;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.75rem;
        }
        
        .calendar-container :global(.react-calendar__month-view__weekdays__weekday) {
          padding: 0.75rem 0.25rem;
          background: hsl(var(--muted) / 0.3);
          border-radius: 8px;
          margin: 0 1px;
        }
        
        .calendar-container :global(.react-calendar__tile) {
          position: relative;
          border-radius: 12px;
          border: 1px solid hsl(var(--border) / 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: hsl(var(--background) / 0.8);
          margin: 2px;
          padding: 0.75rem 0.5rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
          min-height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .calendar-container :global(.react-calendar__tile:enabled:hover) {
          background: hsl(var(--muted) / 0.8);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px hsl(var(--foreground) / 0.15);
          border-color: hsl(var(--border) / 0.4);
          z-index: 1;
        }
        
        .calendar-container :global(.react-calendar__tile--active) {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          box-shadow: 0 8px 25px hsl(var(--primary) / 0.4);
          transform: translateY(-1px);
          border-color: hsl(var(--primary) / 0.6);
          font-weight: 600;
        }
        
        .calendar-container :global(.react-calendar__tile--now) {
          background: hsl(var(--accent) / 0.1);
          border-color: hsl(var(--accent) / 0.3);
          color: hsl(var(--accent-foreground));
          font-weight: 600;
        }
        
        .calendar-container :global(.react-calendar__tile--now:hover) {
          background: hsl(var(--accent) / 0.2);
          border-color: hsl(var(--accent) / 0.5);
        }
        
        /* Status-specific styles with enhanced modern design */
        .calendar-container :global(.react-calendar__tile.available) {
          background: linear-gradient(135deg, hsl(var(--background) / 0.9), hsl(var(--background) / 0.7));
          border-color: hsl(var(--border) / 0.2);
        }
        
        .calendar-container :global(.react-calendar__tile.pending) {
          background: linear-gradient(135deg, hsl(45 93% 47% / 0.15), hsl(45 93% 47% / 0.05));
          border-color: hsl(45 93% 47% / 0.4);
          color: hsl(45 60% 35%);
          font-weight: 600;
          box-shadow: 0 2px 8px hsl(45 93% 47% / 0.2);
        }
        
        .calendar-container :global(.react-calendar__tile.approved) {
          background: linear-gradient(135deg, hsl(221 83% 53% / 0.15), hsl(221 83% 53% / 0.05));
          border-color: hsl(221 83% 53% / 0.4);
          color: hsl(221 60% 35%);
          font-weight: 600;
          box-shadow: 0 2px 8px hsl(221 83% 53% / 0.2);
        }
        
        .calendar-container :global(.react-calendar__tile.active) {
          background: linear-gradient(135deg, hsl(142 71% 45% / 0.15), hsl(142 71% 45% / 0.05));
          border-color: hsl(142 71% 45% / 0.4);
          color: hsl(142 60% 25%);
          font-weight: 600;
          box-shadow: 0 2px 8px hsl(142 71% 45% / 0.2);
        }
        
        .calendar-container :global(.react-calendar__tile.unavailable) {
          background: linear-gradient(135deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.4));
          border-color: hsl(var(--border) / 0.3);
          opacity: 0.5;
          color: hsl(var(--muted-foreground));
          cursor: not-allowed;
        }
        
        .calendar-container :global(.react-calendar__tile.unavailable:hover) {
          transform: none;
          box-shadow: none;
        }
        
        /* Add pulse animation for status tiles */
        .calendar-container :global(.react-calendar__tile.pending),
        .calendar-container :global(.react-calendar__tile.approved),
        .calendar-container :global(.react-calendar__tile.active) {
          animation: statusPulse 2s ease-in-out infinite;
        }
        
        @keyframes statusPulse {
          0%, 100% {
            box-shadow: 0 2px 8px currentColor;
          }
          50% {
            box-shadow: 0 4px 16px currentColor;
          }
        }
        
        /* Dark mode enhancements */
        @media (prefers-color-scheme: dark) {
          .calendar-container :global(.react-calendar__navigation) {
            background: hsl(var(--background) / 0.7);
          }
          
          .calendar-container :global(.react-calendar__tile) {
            background: hsl(var(--background) / 0.6);
            border-color: hsl(var(--border) / 0.3);
          }
          
          .calendar-container :global(.react-calendar__tile:enabled:hover) {
            background: hsl(var(--muted) / 0.9);
            box-shadow: 0 8px 25px hsl(var(--foreground) / 0.25);
          }
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .calendar-container :global(.react-calendar__tile) {
            min-height: 2.5rem;
            padding: 0.5rem 0.25rem;
            font-size: 0.8rem;
          }
          
          .calendar-container :global(.react-calendar__navigation) {
            height: 2.5rem;
            margin-bottom: 1rem;
          }
          
          .calendar-container :global(.react-calendar__navigation button) {
            min-width: 2.25rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </AnimatedCard>
  )
}