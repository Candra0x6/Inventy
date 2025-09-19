import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  itemId: z.string().optional(),
  category: z.string().optional(),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view analytics
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = analyticsQuerySchema.parse(params)

    // Calculate date range based on timeframe
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    if (validatedParams.startDate && validatedParams.endDate) {
      startDate = new Date(validatedParams.startDate)
      endDate = new Date(validatedParams.endDate)
    } else {
      switch (validatedParams.timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date('1970-01-01')
      }
    }

    // Build base where clause
    const whereClause: Prisma.ReturnWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (validatedParams.userId) {
      whereClause.userId = validatedParams.userId
    }

    if (validatedParams.itemId) {
      whereClause.itemId = validatedParams.itemId
    }

    if (validatedParams.category) {
      whereClause.item = {
        category: validatedParams.category
      }
    }

    // Fetch return analytics data in parallel
    const [
      totalReturns,
      returnsByStatus,
      returnsByCondition,
      overdueReturns,
      damageReports,
      averageReturnTime,
      returnTrends,
      topCategories,
      userReturns,
      penaltyStats
    ] = await Promise.all([
      // Total returns count
      prisma.return.count({ where: whereClause }),

      // Returns grouped by status
      prisma.return.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),

      // Returns grouped by condition
      prisma.return.groupBy({
        by: ['conditionOnReturn'],
        where: whereClause,
        _count: true,
      }),

      // Overdue returns - get all overdue returns first, then filter in application code
      prisma.return.findMany({
        where: whereClause,
        select: {
          id: true,
          returnDate: true,
          reservation: {
            select: {
              endDate: true
            }
          }
        }
      }),

      // Damage reports count
      prisma.damageReport.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(validatedParams.itemId && {
            return: {
              itemId: validatedParams.itemId
            }
          })
        }
      }),

      // Average return time calculation
      prisma.return.findMany({
        where: whereClause,
        select: {
          returnDate: true,
          reservation: {
            select: {
              startDate: true,
              endDate: true,
            }
          }
        }
      }),

      // Return trends over time - get all returns and group by date in application code
      prisma.return.findMany({
        where: whereClause,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),

      // Top categories by return volume
      prisma.return.groupBy({
        by: ['itemId'],
        where: whereClause,
        _count: true,
        orderBy: {
          _count: {
            itemId: 'desc'
          }
        },
        take: 10,
      }),

      // User return statistics
      prisma.return.groupBy({
        by: ['userId'],
        where: whereClause,
        _count: true,
        _avg: {
          penaltyAmount: true,
        },
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10,
      }),

      // Penalty statistics
      prisma.return.aggregate({
        where: {
          ...whereClause,
          penaltyApplied: true,
        },
        _count: true,
        _sum: {
          penaltyAmount: true,
        },
        _avg: {
          penaltyAmount: true,
        },
      }),
    ])

    // Calculate additional metrics
    const returnTimeData = averageReturnTime.map(ret => {
      const reservationDays = Math.ceil(
        (new Date(ret.reservation.endDate).getTime() - new Date(ret.reservation.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
      const actualDays = Math.ceil(
        (new Date(ret.returnDate).getTime() - new Date(ret.reservation.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
      return {
        planned: reservationDays,
        actual: actualDays,
        isOverdue: actualDays > reservationDays
      }
    })

    const avgPlannedTime = returnTimeData.length > 0 
      ? returnTimeData.reduce((sum, item) => sum + item.planned, 0) / returnTimeData.length 
      : 0

    const avgActualTime = returnTimeData.length > 0 
      ? returnTimeData.reduce((sum, item) => sum + item.actual, 0) / returnTimeData.length 
      : 0

    const overdueCount = returnTimeData.filter(item => item.isOverdue).length
    const overdueRate = totalReturns > 0 ? (overdueCount / totalReturns) * 100 : 0

    // Process overdue returns result - count returns where return_date > end_date
    const overdueReturnsResult = Array.isArray(overdueReturns) 
      ? overdueReturns.filter(ret => ret.returnDate > ret.reservation.endDate).length
      : 0

    // Process return trends data - group by date
    const trendsMap = new Map<string, number>()
    returnTrends.forEach(ret => {
      const dateKey = ret.createdAt.toISOString().split('T')[0] // Get YYYY-MM-DD format
      trendsMap.set(dateKey, (trendsMap.get(dateKey) || 0) + 1)
    })
    
    const processedTrends = Array.from(trendsMap.entries()).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Get category names for top categories
    const topCategoryData = await Promise.all(
      topCategories.map(async (cat) => {
        const item = await prisma.item.findUnique({
          where: { id: cat.itemId },
          select: { category: true, name: true }
        })
        return {
          category: item?.category || 'Unknown',
          itemName: item?.name || 'Unknown',
          count: cat._count
        }
      })
    )

    // Get user names for top users
    const topUserData = await Promise.all(
      userReturns.map(async (user) => {
        const userData = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true, email: true, trustScore: true }
        })
        return {
          userId: user.userId,
          name: userData?.name || 'Unknown',
          email: userData?.email || 'Unknown',
          trustScore: userData?.trustScore || 0,
          returnCount: user._count,
          avgPenalty: user._avg.penaltyAmount || 0
        }
      })
    )

    // Format response
    const analytics = {
      summary: {
        totalReturns,
        overdueReturns: overdueReturnsResult,
        overdueRate: Math.round(overdueRate * 100) / 100,
        damageReports,
        avgPlannedTime: Math.round(avgPlannedTime * 100) / 100,
        avgActualTime: Math.round(avgActualTime * 100) / 100,
        penaltyCount: penaltyStats._count || 0,
        totalPenalties: penaltyStats._sum?.penaltyAmount || 0,
        avgPenalty: penaltyStats._avg?.penaltyAmount || 0,
      },
      breakdowns: {
        byStatus: returnsByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        byCondition: returnsByCondition.map(item => ({
          condition: item.conditionOnReturn,
          count: item._count
        })),
        topCategories: topCategoryData.slice(0, 5),
        topUsers: topUserData.slice(0, 5),
      },
      trends: {
        daily: processedTrends,
        timeframe: validatedParams.timeframe,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        timeframe: validatedParams.timeframe,
        filters: {
          userId: validatedParams.userId,
          itemId: validatedParams.itemId,
          category: validatedParams.category,
        }
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching return analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}