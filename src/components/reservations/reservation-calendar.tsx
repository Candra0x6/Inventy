'use client'

import { useState, useEffect, useCallback } from 'react'
import Calendar from 'react-calendar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  selectedRange,
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
  }, [itemId, currentMonth, fetchReservations])

  // Check if a date is within any reservation
  const getReservationForDate = (date: Date): Reservation | null => {
    if (!calendarData?.reservations) return null

    return calendarData.reservations.find(reservation => {
      const startDate = new Date(reservation.startDate)
      const endDate = new Date(reservation.endDate)
      
      // Set time to compare dates only
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)
      
      return checkDate >= startDate && checkDate <= endDate
    }) || null
  }

  // Check if a date is available for booking
  const isDateAvailable = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Past dates are not available
    if (date < today) return false
    
    // Check if date conflicts with existing reservations
    const reservation = getReservationForDate(date)
    if (reservation && ['PENDING', 'APPROVED', 'ACTIVE'].includes(reservation.status)) {
      return false
    }
    
    return true
  }

  // Generate class names for calendar tiles
  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null

    const classes = []
    const reservation = getReservationForDate(date)
    
    if (reservation) {
      switch (reservation.status) {
        case 'PENDING':
          classes.push('bg-yellow-100 border-yellow-300 text-yellow-800')
          break
        case 'APPROVED':
          classes.push('bg-blue-100 border-blue-300 text-blue-800')
          break
        case 'ACTIVE':
          classes.push('bg-green-100 border-green-300 text-green-800')
          break
        case 'COMPLETED':
          classes.push('bg-gray-100 border-gray-300 text-gray-600')
          break
        case 'CANCELLED':
          classes.push('bg-red-100 border-red-300 text-red-800')
          break
      }
    } else if (isDateAvailable(date)) {
      classes.push('hover:bg-green-50 cursor-pointer')
    } else {
      classes.push('bg-gray-50 text-gray-400 cursor-not-allowed')
    }

    // Highlight selected range
    if (selectedRange) {
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      const start = new Date(selectedRange.start)
      start.setHours(0, 0, 0, 0)
      const end = new Date(selectedRange.end)
      end.setHours(0, 0, 0, 0)
      
      if (checkDate >= start && checkDate <= end) {
        classes.push('!bg-blue-200 !border-blue-400')
      }
    }

    return classes.join(' ')
  }

  // Handle date click
  const handleDateClick = (value: Value) => {
    if (Array.isArray(value)) {
      // Range selection
      const [start, end] = value
      if (start && end && onDateSelect) {
        onDateSelect(start, end)
      }
    } else if (value) {
      // Single date selection
      if (isRangeSelection) {
        setSelectedDate(value)
      } else {
        const reservation = getReservationForDate(value)
        if (reservation && onReservationSelect) {
          onReservationSelect(reservation)
        } else if (isDateAvailable(value) && onDateSelect) {
          onDateSelect(value)
        }
      }
    }
  }

  // Handle month navigation
  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      setCurrentMonth(activeStartDate)
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchReservations(currentMonth)}>
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {calendarData?.item.name} - Availability Calendar
            </h3>
            <p className="text-sm text-gray-600">
              Select dates to make a reservation or click on existing reservations for details
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isRangeSelection ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsRangeSelection(!isRangeSelection)}
            >
              {isRangeSelection ? 'Range Selection' : 'Single Date'}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-50 border border-gray-300 rounded"></div>
            <span>Unavailable</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-container">
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

        {/* Reservations List */}
        {calendarData?.reservations && calendarData.reservations.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">
              Reservations for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {calendarData.reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => onReservationSelect?.(reservation)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        reservation.status === 'APPROVED' ? 'default' :
                        reservation.status === 'PENDING' ? 'secondary' :
                        reservation.status === 'ACTIVE' ? 'default' :
                        'outline'
                      }>
                        {reservation.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {reservation.user.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(reservation.startDate).toLocaleDateString()} - {' '}
                      {new Date(reservation.endDate).toLocaleDateString()}
                    </div>
                    {reservation.purpose && (
                      <div className="text-xs text-gray-500 mt-1">
                        {reservation.purpose}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .calendar-container :global(.react-calendar) {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .calendar-container :global(.react-calendar__tile) {
          position: relative;
          border-radius: 4px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        
        .calendar-container :global(.react-calendar__tile:enabled:hover) {
          background-color: #f3f4f6;
        }
        
        .calendar-container :global(.react-calendar__tile--active) {
          background: #3b82f6 !important;
          color: white !important;
        }
      `}</style>
    </Card>
  )
}