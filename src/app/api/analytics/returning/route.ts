import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReturnStatus } from '@prisma/client'

interface ReturnDataPoint {
  date: string
  count: number
  label?: string
}

interface ReturnAnalyticsResponse {
  datasets: Array<{
    label: string
    data: ReturnDataPoint[]
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
    totalOnTime: number
    totalOverdue: number
    totalDamaged: number
    overdueRate: number
    damageRate: number
    avgReturnTime: number
    // Returning specific properties
    onTime: number
    overdue: number
    damaged: number
    returnRate: number
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
        // Get the earliest return date
        const firstReturn = await prisma.return.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        })
        if (firstReturn) {
          startDate.setTime(firstReturn.createdAt.getTime())
        } else {
          startDate.setMonth(endDate.getMonth() - 12) // Default to 1 year if no data
        }
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Fetch return data
    const returns = await prisma.return.findMany({
      where: {
        returnDate: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: {
        reservation: {
          select: {
            endDate: true,
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
          }
        },
        item: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: { returnDate: 'asc' }
    })

    // Get return counts by status
    const statusCounts = await prisma.return.groupBy({
      by: ['status'],
      where: {
        returnDate: {
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
    const onTimeReturns = intervals.map(interval => {
      const intervalStart = new Date(interval.start)
      const intervalEnd = new Date(interval.end)
      
      const count = returns.filter(returnItem => {
        const returnDate = new Date(returnItem.returnDate)
        const isInInterval = returnDate >= intervalStart && returnDate < intervalEnd
        const isOnTime = returnDate <= new Date(returnItem.reservation.endDate)
        return isInInterval && isOnTime
      }).length

      return {
        date: interval.start.toISOString(),
        count,
        label: `${count} on-time ${count === 1 ? 'return' : 'returns'}`
      }
    })

    const overdueReturns = intervals.map(interval => {
      const intervalStart = new Date(interval.start)
      const intervalEnd = new Date(interval.end)
      
      const count = returns.filter(returnItem => {
        const returnDate = new Date(returnItem.returnDate)
        const isInInterval = returnDate >= intervalStart && returnDate < intervalEnd
        const isOverdue = returnDate > new Date(returnItem.reservation.endDate)
        return isInInterval && isOverdue
      }).length

      return {
        date: interval.start.toISOString(),
        count,
        label: `${count} overdue ${count === 1 ? 'return' : 'returns'}`
      }
    })

    const totalReturns = intervals.map(interval => {
      const intervalStart = new Date(interval.start)
      const intervalEnd = new Date(interval.end)
      
      const count = returns.filter(returnItem => {
        const returnDate = new Date(returnItem.returnDate)
        return returnDate >= intervalStart && returnDate < intervalEnd
      }).length

      return {
        date: interval.start.toISOString(),
        count,
        label: `${count} total ${count === 1 ? 'return' : 'returns'}`
      }
    })

    // Calculate summary statistics
    const totalReturnCount = returns.length
    const averageReturns = totalReturnCount > 0 ? totalReturnCount / intervals.length : 0
    const peakDay = Math.max(...totalReturns.map(d => d.count), 0)
    
    // Calculate overdue and damage rates
    const onTimeCount = returns.filter(r => 
      new Date(r.returnDate) <= new Date(r.reservation.endDate)
    ).length
    const overdueCount = totalReturnCount - onTimeCount
    const overdueRate = totalReturnCount > 0 ? (overdueCount / totalReturnCount) * 100 : 0
    
    const damagedCount = statusCounts.find(s => s.status === ReturnStatus.DAMAGED)?._count.id || 0
    const damageRate = totalReturnCount > 0 ? (damagedCount / totalReturnCount) * 100 : 0
    
    // Calculate average return time
    const returnTimes = returns.map(r => {
      const returnDate = new Date(r.returnDate)
      const startDate = new Date(r.reservation.startDate)
      return Math.ceil((returnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    })
    const avgReturnTime = returnTimes.length > 0 
      ? returnTimes.reduce((sum, time) => sum + time, 0) / returnTimes.length 
      : 0
    
    // Calculate growth trend (compare first quarter vs last quarter)
    const quarterLength = Math.floor(totalReturns.length / 4)
    let growth = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    
    if (quarterLength > 0) {
      const firstQuarter = totalReturns.slice(0, quarterLength)
      const lastQuarter = totalReturns.slice(-quarterLength)
      
      const firstAvg = firstQuarter.reduce((sum, d) => sum + d.count, 0) / firstQuarter.length
      const lastAvg = lastQuarter.reduce((sum, d) => sum + d.count, 0) / lastQuarter.length
      
      if (firstAvg > 0) {
        growth = ((lastAvg - firstAvg) / firstAvg) * 100
        trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
      }
    }

    const response: ReturnAnalyticsResponse = {
      datasets: [
        {
          label: 'On-Time Returns',
          data: onTimeReturns,
          color: '#10b981',
          fillColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3
        },
        {
          label: 'Overdue Returns',
          data: overdueReturns,
          color: '#ef4444',
          fillColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2
        },
        {
          label: 'Total Returns',
          data: totalReturns,
          color: '#6b7280',
          fillColor: 'rgba(107, 114, 128, 0.05)',
          borderWidth: 1
        }
      ],
      summary: {
        total: totalReturnCount,
        average: Math.round(averageReturns * 10) / 10,
        peak: peakDay,
        growth: Math.round(growth * 10) / 10,
        trend,
        totalOnTime: onTimeCount,
        totalOverdue: overdueCount,
        totalDamaged: damagedCount,
        overdueRate: Math.round(overdueRate * 10) / 10,
        damageRate: Math.round(damageRate * 10) / 10,
        avgReturnTime: Math.round(avgReturnTime * 10) / 10,
        // Returning specific properties
        onTime: onTimeCount,
        overdue: overdueCount,
        damaged: damagedCount,
        returnRate: totalReturnCount > 0 ? Math.round((onTimeCount / totalReturnCount) * 100 * 10) / 10 : 0
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
    console.error('Error fetching return analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch return analytics' },
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