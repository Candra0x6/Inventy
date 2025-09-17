import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get usage analytics
    const [
      borrowingTrend,
      categoryUsage,
      recentActivity,
      trustScoreHistory
    ] = await Promise.all([
      // Borrowing trend over time
      prisma.reservation.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        }
      }),
      
      // Most borrowed categories
      prisma.reservation.groupBy({
        by: ['itemId'],
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      }),
      
      // Recent activity
      prisma.reservation.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        include: {
          item: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      
      // Trust score history
      prisma.reputationHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ])

    // Process borrowing trend data
    const trendData = borrowingTrend.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      count: item._count.id
    }))

    // Get category names for category usage
    const itemIds = categoryUsage.map(item => item.itemId)
    const items = await prisma.item.findMany({
      where: {
        id: {
          in: itemIds
        }
      },
      select: {
        id: true,
        category: true
      }
    })

    const categoryMap = items.reduce((acc, item) => {
      acc[item.id] = item.category
      return acc
    }, {} as Record<string, string>)

    const categoryData = categoryUsage.map(item => ({
      category: categoryMap[item.itemId] || 'Unknown',
      count: item._count.id
    }))

    // Process recent activity
    const activityData = recentActivity.map(reservation => ({
      id: reservation.id,
      action: 'borrowed',
      itemName: reservation.item.name,
      date: reservation.createdAt,
      status: reservation.status
    }))

    // Process trust score history
    const trustScoreData = trustScoreHistory.map(history => ({
      date: history.createdAt.toISOString().split('T')[0],
      score: history.newScore,
      change: history.change,
      reason: history.reason
    }))

    const analytics = {
      borrowingTrend: trendData,
      categoryUsage: categoryData,
      recentActivity: activityData,
      trustScoreHistory: trustScoreData,
      period: daysAgo
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching usage analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage analytics' },
      { status: 500 }
    )
  }
}