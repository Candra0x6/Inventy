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
    const limit = parseInt(searchParams.get('limit') || '10')

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Get various types of notifications
    const [
      overdueReservations,
      dueSoonReservations,
      pendingApprovals,
      recentUpdates
    ] = await Promise.all([
      // Overdue items
      prisma.reservation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: {
            lt: now
          }
        },
        include: {
          item: true
        },
        orderBy: {
          endDate: 'asc'
        }
      }),
      
      // Items due soon (within 24 hours)
      prisma.reservation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: tomorrow
          }
        },
        include: {
          item: true
        },
        orderBy: {
          endDate: 'asc'
        }
      }),
      
      // Pending reservation approvals
      prisma.reservation.findMany({
        where: {
          userId,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        },
        include: {
          item: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      
      // Recent status updates
      prisma.reservation.findMany({
        where: {
          userId,
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          item: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: limit
      })
    ])

    // Build notifications array
    const notifications: Array<{
      id: string
      type: string
      severity: 'high' | 'medium' | 'low'
      title: string
      message: string
      actionUrl: string
      createdAt: Date
      metadata: Record<string, unknown>
    }> = []

    // Add overdue notifications
    overdueReservations.forEach(reservation => {
      const daysOverdue = Math.ceil((now.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      notifications.push({
        id: `overdue-${reservation.id}`,
        type: 'overdue',
        severity: 'high',
        title: 'Item Overdue',
        message: `${reservation.item.name} is ${daysOverdue} day(s) overdue`,
        actionUrl: `/reservations/${reservation.id}`,
        createdAt: reservation.endDate,
        metadata: {
          reservationId: reservation.id,
          itemName: reservation.item.name,
          daysOverdue
        }
      })
    })

    // Add due soon notifications
    dueSoonReservations.forEach(reservation => {
      const hoursUntilDue = Math.ceil((reservation.endDate.getTime() - now.getTime()) / (1000 * 60 * 60))
      notifications.push({
        id: `due-soon-${reservation.id}`,
        type: 'due_soon',
        severity: 'medium',
        title: 'Item Due Soon',
        message: `${reservation.item.name} is due in ${hoursUntilDue} hour(s)`,
        actionUrl: `/reservations/${reservation.id}`,
        createdAt: reservation.createdAt,
        metadata: {
          reservationId: reservation.id,
          itemName: reservation.item.name,
          hoursUntilDue
        }
      })
    })

    // Add pending approval notifications
    pendingApprovals.forEach(reservation => {
      let message = ''
      if (reservation.status === 'PENDING') {
        message = `Your request for ${reservation.item.name} is pending approval`
      } else if (reservation.status === 'APPROVED') {
        message = `Your request for ${reservation.item.name} has been approved - ready for pickup`
      }
      
      notifications.push({
        id: `approval-${reservation.id}`,
        type: 'approval',
        severity: 'low',
        title: 'Reservation Update',
        message,
        actionUrl: `/reservations/${reservation.id}`,
        createdAt: reservation.updatedAt,
        metadata: {
          reservationId: reservation.id,
          itemName: reservation.item.name,
          status: reservation.status
        }
      })
    })

    // Sort notifications by severity and date
    const severityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 }
    notifications.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Get counts for different notification types
    const counts = {
      overdue: overdueReservations.length,
      dueSoon: dueSoonReservations.length,
      pending: pendingApprovals.filter(r => r.status === 'PENDING').length,
      approved: pendingApprovals.filter(r => r.status === 'APPROVED').length,
      total: notifications.length
    }

    return NextResponse.json({
      notifications: notifications.slice(0, limit),
      counts,
      hasMore: notifications.length > limit
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}