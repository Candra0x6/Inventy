import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  severity: z.enum(['ALL', 'MODERATE', 'HIGH', 'CRITICAL']).default('ALL'),
  userId: z.string().optional(),
  itemId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const notificationSchema = z.object({
  reservationIds: z.array(z.string()).min(1, 'At least one reservation ID is required'),
  notificationType: z.enum(['REMINDER', 'WARNING', 'FINAL_NOTICE']),
  customMessage: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can access late return tracking' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const validatedParams = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      severity: searchParams.get('severity'),
      userId: searchParams.get('userId'),
      itemId: searchParams.get('itemId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    })

    const now = new Date()
    const offset = (validatedParams.page - 1) * validatedParams.limit

    // Build where conditions
    const whereConditions = {
      status: 'ACTIVE' as const,
      endDate: { lt: now }, // Reservations past their end date
      returns: { none: {} }, // No return record exists
      ...(validatedParams.userId && { userId: validatedParams.userId }),
      ...(validatedParams.itemId && { itemId: validatedParams.itemId }),
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      whereConditions.endDate = {
        ...whereConditions.endDate,
        ...(validatedParams.dateFrom && { gte: new Date(validatedParams.dateFrom) }),
        ...(validatedParams.dateTo && { lte: new Date(validatedParams.dateTo) }),
      }
    }

    // Get overdue reservations
    const overdueReservations = await prisma.reservation.findMany({
      where: whereConditions,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            condition: true,
            category: true,
            value: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            trustScore: true,
          }
        }
      },
      skip: offset,
      take: validatedParams.limit,
      orderBy: { endDate: 'asc' }, // Oldest overdue first
    })

    // Calculate overdue metrics
    const overdueWithMetrics = overdueReservations.map(reservation => {
      const daysOverdue = Math.ceil((now.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let severity: 'MODERATE' | 'HIGH' | 'CRITICAL'
      if (daysOverdue <= 3) severity = 'MODERATE'
      else if (daysOverdue <= 7) severity = 'HIGH'
      else severity = 'CRITICAL'

      // Calculate potential penalty
      const basePenalty = Math.min(daysOverdue * 2, 20) // 2 points per day, max 20
      const valuePenalty = reservation.item.value ? Math.min(reservation.item.value * 0.001, 10) : 0
      const totalPenalty = Math.min(basePenalty + valuePenalty, 30)

      return {
        ...reservation,
        daysOverdue,
        severity,
        potentialPenalty: totalPenalty,
        lastNotificationSent: null, // TODO: Track this in database
        notificationCount: 0, // TODO: Track this in database
      }
    })

    // Filter by severity if specified
    const filteredReservations = validatedParams.severity === 'ALL' 
      ? overdueWithMetrics
      : overdueWithMetrics.filter(r => r.severity === validatedParams.severity)

    // Get total count for pagination
    const totalCount = await prisma.reservation.count({
      where: whereConditions,
    })

    // Calculate analytics
    const analytics = {
      totalOverdue: totalCount,
      bySeverity: {
        moderate: overdueWithMetrics.filter(r => r.severity === 'MODERATE').length,
        high: overdueWithMetrics.filter(r => r.severity === 'HIGH').length,
        critical: overdueWithMetrics.filter(r => r.severity === 'CRITICAL').length,
      },
      averageDaysOverdue: overdueWithMetrics.length > 0 
        ? overdueWithMetrics.reduce((sum, r) => sum + r.daysOverdue, 0) / overdueWithMetrics.length 
        : 0,
      totalPotentialPenalty: overdueWithMetrics.reduce((sum, r) => sum + r.potentialPenalty, 0),
      affectedUsers: new Set(overdueWithMetrics.map(r => r.user.id)).size,
      topOverdueItems: overdueWithMetrics
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5)
        .map(r => ({
          itemId: r.item.id,
          itemName: r.item.name,
          daysOverdue: r.daysOverdue,
          borrowerName: r.user.name,
        })),
    }

    return NextResponse.json({
      overdueReservations: filteredReservations,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit),
      },
      analytics,
    })

  } catch (error) {
    console.error('Error fetching overdue reservations:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch overdue reservations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can send late return notifications' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = notificationSchema.parse(body)

    // Get reservation details
    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: validatedData.reservationIds },
        status: 'ACTIVE',
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: 'No valid active reservations found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const notificationResults = []

    // Process notifications in transaction
    const result = await prisma.$transaction(async (tx) => {
      for (const reservation of reservations) {
        const daysOverdue = Math.ceil((now.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Create audit log for notification
        const auditLog = await tx.auditLog.create({
          data: {
            action: `SEND_LATE_RETURN_NOTIFICATION`,
            entityType: 'Reservation',
            entityId: reservation.id,
            userId: session.user.id,
            changes: {
              notificationType: validatedData.notificationType,
              daysOverdue,
              itemName: reservation.item.name,
              borrowerEmail: reservation.user.email,
              customMessage: validatedData.customMessage,
              sentBy: session.user.email,
              sentAt: now.toISOString(),
            }
          }
        })

        notificationResults.push({
          reservationId: reservation.id,
          itemName: reservation.item.name,
          borrowerName: reservation.user.name,
          borrowerEmail: reservation.user.email,
          daysOverdue,
          notificationType: validatedData.notificationType,
          auditLogId: auditLog.id,
        })

        // TODO: Here you would integrate with your notification service
        // Examples: Email service (Postmark), SMS, push notifications
        // await sendEmailNotification(reservation.user.email, ...)
        // await sendPushNotification(reservation.user.id, ...)
      }

      return notificationResults
    })

    return NextResponse.json({
      success: true,
      message: `Sent ${validatedData.notificationType.toLowerCase()} notifications to ${result.length} borrowers`,
      notifications: result,
    })

  } catch (error) {
    console.error('Error sending late return notifications:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}