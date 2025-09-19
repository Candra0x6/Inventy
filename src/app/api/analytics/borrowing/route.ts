import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'

interface BorrowingDataPoint {
  date: string
  count: number
  label?: string
}

interface BorrowingAnalyticsResponse {
  datasets: Array<{
    label: string
    data: BorrowingDataPoint[]
    color: string
    fillColor?: string
    borderWidth?: number
  }>
  summary: {
    total: number
    average: number
    peak: number
    growth: number
    trend: 'up' | 'down' | 'stable'
    totalActive: number
    totalPending: number
    totalCompleted: number
    // Borrowing specific properties
    pending: number
    approved: number
    rejected: number
    averageProcessingTime: number
  }
  metadata: {
    generatedAt: string
    timeframe: string
    startDate: string
    endDate: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    
    // Calculate date range based on timeframe
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'all':
        // Get the earliest reservation date
        const firstReservation = await prisma.reservation.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        })
        if (firstReservation) {
          startDate.setTime(firstReservation.createdAt.getTime())
        } else {
          startDate.setMonth(endDate.getMonth() - 12) // Default to 1 year if no data
        }
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Fetch borrowing data (reservations that became active)
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: [ReservationStatus.ACTIVE, ReservationStatus.COMPLETED, ReservationStatus.APPROVED]
        }
      },
      select: {
        id: true,
        createdAt: true,
        actualStartDate: true,
        status: true,
        startDate: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        item: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Get reservation counts by status
    const statusCounts = await prisma.reservation.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      _count: {
        id: true
      }
    })

    // Generate time intervals based on timeframe
    const intervals = generateTimeIntervals(startDate, endDate, timeframe)
    
    // Aggregate data by day/week/month based on timeframe
    const dailyBorrowings = intervals.map(interval => {
      const intervalStart = new Date(interval.start)
      const intervalEnd = new Date(interval.end)
      
      const count = reservations.filter(reservation => {
        const reservationDate = reservation.actualStartDate || reservation.createdAt
        return reservationDate >= intervalStart && reservationDate < intervalEnd
      }).length

      return {
        date: interval.start.toISOString(),
        count,
        label: `${count} ${count === 1 ? 'borrowing' : 'borrowings'} on ${interval.start.toLocaleDateString()}`
      }
    })

    // Calculate peak borrowings by category
    const categoryBorrowings = intervals.map(interval => {
      const intervalStart = new Date(interval.start)
      const intervalEnd = new Date(interval.end)
      
      const categoryCounts = new Map<string, number>()
      
      reservations.forEach(reservation => {
        const reservationDate = reservation.actualStartDate || reservation.createdAt
        if (reservationDate >= intervalStart && reservationDate < intervalEnd) {
          const category = reservation.item.category
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
        }
      })

      // Get the highest category count for this interval
      const maxCount = Math.max(...Array.from(categoryCounts.values()), 0)
      
      return {
        date: interval.start.toISOString(),
        count: maxCount,
        label: `Peak: ${maxCount} borrowings`
      }
    })

    // Calculate summary statistics
    const totalBorrowings = reservations.length
    const averageBorrowings = totalBorrowings > 0 ? totalBorrowings / intervals.length : 0
    const peakDay = Math.max(...dailyBorrowings.map(d => d.count), 0)
    
    // Calculate growth trend (compare first quarter vs last quarter)
    const quarterLength = Math.floor(dailyBorrowings.length / 4)
    let growth = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    
    if (quarterLength > 0) {
      const firstQuarter = dailyBorrowings.slice(0, quarterLength)
      const lastQuarter = dailyBorrowings.slice(-quarterLength)
      
      const firstAvg = firstQuarter.reduce((sum, d) => sum + d.count, 0) / firstQuarter.length
      const lastAvg = lastQuarter.reduce((sum, d) => sum + d.count, 0) / lastQuarter.length
      
      if (firstAvg > 0) {
        growth = ((lastAvg - firstAvg) / firstAvg) * 100
        trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
      }
    }

    // Get status counts
    const totalActive = statusCounts.find(s => s.status === ReservationStatus.ACTIVE)?._count.id || 0
    const totalPending = statusCounts.find(s => s.status === ReservationStatus.PENDING)?._count.id || 0
    const totalCompleted = statusCounts.find(s => s.status === ReservationStatus.COMPLETED)?._count.id || 0
    const totalApproved = statusCounts.find(s => s.status === ReservationStatus.APPROVED)?._count.id || 0
    const totalRejected = statusCounts.find(s => s.status === ReservationStatus.REJECTED)?._count.id || 0

    // Calculate average processing time (time from creation to approval/rejection)
    const processedReservations = reservations.filter(r => 
      r.status === ReservationStatus.APPROVED || 
      r.status === ReservationStatus.REJECTED || 
      r.status === ReservationStatus.ACTIVE
    )
    
    let averageProcessingTimeHours = 0
    if (processedReservations.length > 0) {
      const totalProcessingTime = processedReservations.reduce((total, reservation) => {
        const startDate = reservation.actualStartDate || reservation.startDate
        const processingTime = startDate.getTime() - reservation.createdAt.getTime()
        return total + processingTime
      }, 0)
      averageProcessingTimeHours = totalProcessingTime / (processedReservations.length * 1000 * 60 * 60) // Convert to hours
    }

    const response: BorrowingAnalyticsResponse = {
      datasets: [
        {
          label: 'Daily Borrowings',
          data: dailyBorrowings,
          color: '#3b82f6',
          fillColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3
        },
        {
          label: 'Peak Categories',
          data: categoryBorrowings,
          color: '#8b5cf6',
          fillColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2
        }
      ],
      summary: {
        total: totalBorrowings,
        average: Math.round(averageBorrowings * 10) / 10,
        peak: peakDay,
        growth: Math.round(growth * 10) / 10,
        trend,
        totalActive,
        totalPending,
        totalCompleted,
        // Borrowing specific properties
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        averageProcessingTime: Math.round(averageProcessingTimeHours * 10) / 10
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        timeframe,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching borrowing analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch borrowing analytics' },
      { status: 500 }
    )
  }
}

// Helper function to generate time intervals
function generateTimeIntervals(startDate: Date, endDate: Date, timeframe: string) {
  const intervals = []
  const current = new Date(startDate)
  
  let incrementDays: number
  
  switch (timeframe) {
    case '7d':
    case '30d':
      incrementDays = 1 // Daily intervals
      break
    case '90d':
      incrementDays = 3 // Every 3 days
      break
    case '1y':
      incrementDays = 7 // Weekly intervals
      break
    case 'all':
      incrementDays = 14 // Bi-weekly intervals
      break
    default:
      incrementDays = 1
  }
  
  while (current < endDate) {
    const intervalStart = new Date(current)
    current.setDate(current.getDate() + incrementDays)
    const intervalEnd = new Date(Math.min(current.getTime(), endDate.getTime()))
    
    intervals.push({
      start: intervalStart,
      end: intervalEnd
    })
  }
  
  return intervals
}