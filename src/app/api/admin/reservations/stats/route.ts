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

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeRange))

    // Get overall statistics
    const [
      totalReservations,
      pendingReservations,
      approvedReservations,
      activeReservations,
      completedReservations,
      rejectedReservations,
      cancelledReservations,
      totalItems,
      availableItems,
      borrowedItems,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      // Reservation counts
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'APPROVED' } }),
      prisma.reservation.count({ where: { status: 'ACTIVE' } }),
      prisma.reservation.count({ where: { status: 'COMPLETED' } }),
      prisma.reservation.count({ where: { status: 'REJECTED' } }),
      prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      
      // Item counts
      prisma.item.count(),
      prisma.item.count({ where: { status: 'AVAILABLE' } }),
      prisma.item.count({ where: { status: 'BORROWED' } }),
      
      // User counts
      prisma.user.count(),
      prisma.user.count({ 
        where: { 
          reservations: { 
            some: { 
              createdAt: { gte: startDate } 
            } 
          } 
        } 
      })
    ])

    // Get reservations over time (last 30 days)
    const reservationsOverTime = await prisma.reservation.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      }
    })

    // Get most popular items (by reservation count)
    const popularItems = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        _count: {
          select: {
            reservations: true
          }
        }
      },
      orderBy: {
        reservations: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Get top users by reservation count
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            reservations: true
          }
        }
      },
      orderBy: {
        reservations: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Get recent activity
    const recentActivity = await prisma.reservation.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        startDate: true,
        endDate: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    })

    // Get detailed category statistics
    const categoryStats = await prisma.item.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      _avg: {
        value: true
      }
    })

    // Get reservation counts by category
    const categoryReservations = await prisma.reservation.groupBy({
      by: ['itemId'],
      _count: {
        id: true
      }
    })

    // Map category reservations to categories
    const categoryReservationMap = new Map<string, number>()
    for (const reservation of categoryReservations) {
      const item = await prisma.item.findUnique({
        where: { id: reservation.itemId },
        select: { category: true }
      })
      if (item) {
        const currentCount = categoryReservationMap.get(item.category) || 0
        categoryReservationMap.set(item.category, currentCount + reservation._count.id)
      }
    }

    // Calculate utilization rate
    const utilizationRate = totalItems > 0 ? ((borrowedItems / totalItems) * 100).toFixed(1) : '0'

    // Calculate approval rate
    const totalProcessedReservations = approvedReservations + rejectedReservations
    const approvalRate = totalProcessedReservations > 0 
      ? ((approvedReservations / totalProcessedReservations) * 100).toFixed(1) 
      : '0'

    return NextResponse.json({
      overview: {
        totalReservations,
        pendingReservations,
        approvedReservations,
        activeReservations,
        completedReservations,
        rejectedReservations,
        cancelledReservations,
        totalItems,
        availableItems,
        borrowedItems,
        totalUsers,
        activeUsers,
        utilizationRate: parseFloat(utilizationRate),
        approvalRate: parseFloat(approvalRate)
      },
      trends: {
        reservationsOverTime: reservationsOverTime.map(item => ({
          status: item.status,
          count: item._count.id
        })),
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          itemCount: stat._count?.id || 0,
          reservationCount: categoryReservationMap.get(stat.category) || 0,
          averageValue: stat._avg?.value || 0
        }))
      },
      insights: {
        popularItems: popularItems.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          reservationCount: item._count.reservations
        })),
        topUsers: topUsers.map(user => ({
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: user.role,
          reservationCount: user._count.reservations
        }))
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        status: activity.status,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
        startDate: activity.startDate,
        endDate: activity.endDate,
        user: {
          id: activity.user.id,
          name: activity.user.name || activity.user.email,
          email: activity.user.email
        },
        item: {
          id: activity.item.id,
          name: activity.item.name,
          category: activity.item.category
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching admin statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}