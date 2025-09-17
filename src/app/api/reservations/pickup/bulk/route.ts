import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ReservationStatus } from '@prisma/client'

const bulkPickupSchema = z.object({
  reservationIds: z.array(z.string()).min(1, 'At least one reservation ID is required'),
  staffId: z.string().optional(),
  notes: z.string().optional(),
})

const markOverdueSchema = z.object({
  daysOverdue: z.number().min(1).max(365).default(1),
  includeApproved: z.boolean().default(true),
  includeActive: z.boolean().default(false),
})

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
        { error: 'Only staff can perform bulk pickup operations' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const operation = url.searchParams.get('operation')

    switch (operation) {
      case 'confirm-multiple':
        return await confirmMultiplePickups(request, session)
      case 'mark-overdue':
        return await markOverduePickups(request, session)
      case 'generate-report':
        return await generatePickupReport(request, session)
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: confirm-multiple, mark-overdue, or generate-report' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in bulk pickup operations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function confirmMultiplePickups(request: NextRequest, session: Session) {
  const body = await request.json()
  const validatedData = bulkPickupSchema.parse(body)

  const results = await Promise.allSettled(
    validatedData.reservationIds.map(async (reservationId) => {
      try {
        const reservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
          include: {
            item: true,
            user: { select: { id: true, name: true, email: true } }
          }
        })

        if (!reservation) {
          throw new Error(`Reservation ${reservationId} not found`)
        }

        if (reservation.status !== 'APPROVED') {
          throw new Error(`Reservation ${reservationId} is not approved (status: ${reservation.status})`)
        }

        if (reservation.pickupConfirmed) {
          throw new Error(`Reservation ${reservationId} already picked up`)
        }

        const now = new Date()

        // Update reservation and item status
        // Remove the unused const
        await prisma.$transaction(async (tx) => {
          const updatedReservation = await tx.reservation.update({
            where: { id: reservationId },
            data: {
              pickupConfirmed: true,
              pickupConfirmedAt: now,
              status: 'ACTIVE',
              actualStartDate: now,
              notes: validatedData.notes || reservation.notes,
            }
          })

          await tx.item.update({
            where: { id: reservation.item.id },
            data: { status: 'BORROWED' }
          })

          await tx.auditLog.create({
            data: {
              action: 'BULK_CONFIRM_PICKUP',
              entityType: 'Reservation',
              entityId: reservationId,
              userId: session.user.id,
              changes: {
                confirmedBy: session.user.email,
                confirmedAt: now.toISOString(),
                staffId: validatedData.staffId,
                bulkOperation: true,
                notes: validatedData.notes,
                previousStatus: reservation.status,
                newStatus: 'ACTIVE',
              }
            }
          })

          return updatedReservation
        })

        return {
          id: reservationId,
          success: true,
          item: reservation.item.name,
          user: reservation.user.name,
        }
      } catch (error) {
        return {
          id: reservationId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )

  const processed = results.map(result => 
    result.status === 'fulfilled' ? result.value : {
      id: 'unknown',
      success: false,
      error: 'Promise rejected'
    }
  )

  const successful = processed.filter(r => r.success)
  const failed = processed.filter(r => !r.success)

  return NextResponse.json({
    message: `Processed ${processed.length} reservations`,
    summary: {
      total: processed.length,
      successful: successful.length,
      failed: failed.length,
    },
    successful,
    failed,
  })
}

async function markOverduePickups(request: NextRequest, session: any) {
  const body = await request.json()
  const validatedData = markOverdueSchema.parse(body)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - validatedData.daysOverdue)

  const statusFilter: ReservationStatus[] = []
  if (validatedData.includeApproved) statusFilter.push('APPROVED' as ReservationStatus)
  if (validatedData.includeActive) statusFilter.push('ACTIVE' as ReservationStatus)

  const overdueReservations = await prisma.reservation.findMany({
    where: {
      status: { in: statusFilter },
      startDate: { lt: cutoffDate },
      pickupConfirmed: false,
    },
    include: {
      item: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } }
    }
  })

  if (overdueReservations.length === 0) {
    return NextResponse.json({
      message: 'No overdue pickups found',
      count: 0,
      reservations: []
    })
  }

  // Update trust scores and create audit logs
  const results = await Promise.allSettled(
    overdueReservations.map(async (reservation) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - reservation.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      await prisma.$transaction(async (tx) => {
        // Reduce trust score
        const trustPenalty = Math.min(daysOverdue * 2, 20) // 2 points per day, max 20
        await tx.user.update({
          where: { id: reservation.userId },
          data: {
            trustScore: { decrement: trustPenalty }
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'MARK_PICKUP_OVERDUE',
            entityType: 'Reservation',
            entityId: reservation.id,
            userId: session.user.id,
            changes: {
              markedBy: session.user.email,
              daysOverdue,
              trustPenalty,
              scheduledDate: reservation.startDate.toISOString(),
              currentDate: new Date().toISOString(),
            }
          }
        })
      })

      return {
        id: reservation.id,
        item: reservation.item.name,
        user: reservation.user.name,
        daysOverdue,
        scheduledDate: reservation.startDate.toISOString(),
      }
    })
  )

  const processed = results.map(result => 
    result.status === 'fulfilled' ? result.value : null
  ).filter(Boolean)

  return NextResponse.json({
    message: `Marked ${processed.length} reservations as overdue`,
    count: processed.length,
    reservations: processed,
    penalties: {
      totalReservations: processed.length,
      averageDaysOverdue: processed.length > 0 
        ? processed.reduce((sum, r) => sum + (r?.daysOverdue || 0), 0) / processed.length 
        : 0,
    }
  })
}

async function generatePickupReport(request: NextRequest, session: any) {
  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') || '7')
  const includeDetails = url.searchParams.get('details') === 'true'

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get pickup statistics
  const stats = await prisma.reservation.groupBy({
    by: ['status', 'pickupConfirmed'],
    where: {
      createdAt: { gte: startDate }
    },
    _count: true
  })

  // Get recent confirmations
  const recentConfirmations = await prisma.reservation.findMany({
    where: {
      pickupConfirmed: true,
      pickupConfirmedAt: { gte: startDate }
    },
    select: {
      id: true,
      pickupConfirmedAt: true,
      item: { select: { name: true, category: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { pickupConfirmedAt: 'desc' },
    take: includeDetails ? 50 : 10
  })

  // Get overdue pickups
  const overduePickups = await prisma.reservation.findMany({
    where: {
      status: 'APPROVED',
      pickupConfirmed: false,
      startDate: { lt: new Date() }
    },
    select: {
      id: true,
      startDate: true,
      item: { select: { name: true, category: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { startDate: 'asc' },
    take: includeDetails ? 50 : 10
  })

  const report = {
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    },
    summary: {
      totalReservations: stats.reduce((sum, stat) => sum + stat._count, 0),
      confirmedPickups: recentConfirmations.length,
      overduePickups: overduePickups.length,
      pickupRate: recentConfirmations.length > 0 
        ? ((recentConfirmations.length / stats.reduce((sum, stat) => sum + stat._count, 0)) * 100).toFixed(1)
        : '0.0'
    },
    statusBreakdown: stats.map(stat => ({
      status: stat.status,
      pickupConfirmed: stat.pickupConfirmed,
      count: stat._count
    })),
    recentConfirmations: includeDetails ? recentConfirmations : recentConfirmations.slice(0, 5),
    overduePickups: includeDetails ? overduePickups : overduePickups.slice(0, 5),
    generatedAt: new Date().toISOString(),
    generatedBy: session.user.email,
  }

  return NextResponse.json(report)
}