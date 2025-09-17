import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can run automated tracking' },
        { status: 403 }
      )
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Find all active reservations that are overdue
    const overdueReservations = await prisma.reservation.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
        returns: { none: {} },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
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
      }
    })

    if (overdueReservations.length === 0) {
      return NextResponse.json({
        message: 'No overdue reservations found',
        processed: 0,
        notifications: []
      })
    }

    const processedNotifications = []
    const autoNotificationResults = []

    // Process each overdue reservation
    for (const reservation of overdueReservations) {
      const daysOverdue = Math.ceil((now.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Check if we've already sent a notification recently
      const recentNotification = await prisma.auditLog.findFirst({
        where: {
          action: { startsWith: 'SEND_LATE_RETURN_NOTIFICATION' },
          entityType: 'Reservation',
          entityId: reservation.id,
          createdAt: { gte: oneDayAgo }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Determine notification type based on days overdue
      let notificationType: 'REMINDER' | 'WARNING' | 'FINAL_NOTICE' | null = null
      
      if (daysOverdue === 1 || daysOverdue === 2) {
        notificationType = 'REMINDER'
      } else if (daysOverdue === 5 || daysOverdue === 7) {
        notificationType = 'WARNING'
      } else if (daysOverdue === 10 || daysOverdue === 14) {
        notificationType = 'FINAL_NOTICE'
      }

      // Only send notification if:
      // 1. It's a scheduled notification day
      // 2. No notification was sent in the last 24 hours
      if (notificationType && !recentNotification) {
        // Create audit log for automated notification
        const auditLog = await prisma.auditLog.create({
          data: {
            action: `SEND_LATE_RETURN_NOTIFICATION_AUTO`,
            entityType: 'Reservation',
            entityId: reservation.id,
            userId: session.user.id,
            changes: {
              notificationType,
              daysOverdue,
              itemName: reservation.item.name,
              borrowerEmail: reservation.user.email,
              automatedAt: now.toISOString(),
              scheduledBy: 'SYSTEM',
            }
          }
        })

        autoNotificationResults.push({
          reservationId: reservation.id,
          itemName: reservation.item.name,
          borrowerName: reservation.user.name,
          borrowerEmail: reservation.user.email,
          daysOverdue,
          notificationType,
          auditLogId: auditLog.id,
        })

        processedNotifications.push(reservation.id)

        // TODO: Here you would integrate with your notification service
        // Examples:
        // await sendEmailNotification({
        //   to: reservation.user.email,
        //   subject: `${notificationType} - Overdue Return: ${reservation.item.name}`,
        //   template: 'late-return-notification',
        //   data: {
        //     userName: reservation.user.name,
        //     itemName: reservation.item.name,
        //     daysOverdue,
        //     dueDate: reservation.endDate,
        //     notificationType
        //   }
        // })
      }
    }

    // Update trust scores for critical overdue items (>14 days)
    const criticalOverdue = overdueReservations.filter(r => {
      const daysOverdue = Math.ceil((now.getTime() - r.endDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysOverdue > 14
    })

    const trustScoreUpdates = []
    for (const reservation of criticalOverdue) {
      const daysOverdue = Math.ceil((now.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      const penalty = Math.min(daysOverdue * 0.5, 15) // 0.5 points per day, max 15 for critical

      // Check if penalty was already applied recently
      const recentPenalty = await prisma.auditLog.findFirst({
        where: {
          action: 'APPLY_CRITICAL_OVERDUE_PENALTY',
          entityType: 'Reservation',
          entityId: reservation.id,
          createdAt: { gte: oneDayAgo }
        }
      })

      if (!recentPenalty) {
        // Update user trust score
        await prisma.user.update({
          where: { id: reservation.user.id },
          data: {
            trustScore: Math.max(0, reservation.user.trustScore - penalty)
          }
        })

        // Log the penalty
        await prisma.auditLog.create({
          data: {
            action: 'APPLY_CRITICAL_OVERDUE_PENALTY',
            entityType: 'Reservation',
            entityId: reservation.id,
            userId: session.user.id,
            changes: {
              userId: reservation.user.id,
              previousTrustScore: reservation.user.trustScore,
              penaltyAmount: penalty,
              newTrustScore: Math.max(0, reservation.user.trustScore - penalty),
              daysOverdue,
              reason: `Critical overdue penalty - ${daysOverdue} days late`,
              automatedAt: now.toISOString(),
            }
          }
        })

        trustScoreUpdates.push({
          userId: reservation.user.id,
          userName: reservation.user.name,
          penaltyApplied: penalty,
          daysOverdue
        })
      }
    }

    // Generate summary statistics
    const summary = {
      totalOverdueReservations: overdueReservations.length,
      notificationsSent: autoNotificationResults.length,
      trustScorePenaltiesApplied: trustScoreUpdates.length,
      bySeverity: {
        moderate: overdueReservations.filter(r => {
          const days = Math.ceil((now.getTime() - r.endDate.getTime()) / (1000 * 60 * 60 * 1000))
          return days <= 3
        }).length,
        high: overdueReservations.filter(r => {
          const days = Math.ceil((now.getTime() - r.endDate.getTime()) / (1000 * 60 * 60 * 1000))
          return days > 3 && days <= 7
        }).length,
        critical: overdueReservations.filter(r => {
          const days = Math.ceil((now.getTime() - r.endDate.getTime()) / (1000 * 60 * 60 * 1000))
          return days > 7
        }).length,
      }
    }

    return NextResponse.json({
      success: true,
      message: `Automated tracking completed. Sent ${autoNotificationResults.length} notifications and applied ${trustScoreUpdates.length} penalties.`,
      summary,
      notifications: autoNotificationResults,
      trustScoreUpdates,
      processedAt: now.toISOString(),
    })

  } catch (error) {
    console.error('Error in automated late return tracking:', error)
    return NextResponse.json(
      { error: 'Failed to run automated tracking' },
      { status: 500 }
    )
  }
}