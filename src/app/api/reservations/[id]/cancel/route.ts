import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const cancelReservationSchema = z.object({
  reason: z.string().min(1, 'Reason for cancellation is required'),
  notes: z.string().optional(),
})

interface Params {
  id: string
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = cancelReservationSchema.parse(body)

    // Find the existing reservation
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            status: true,
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

    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Check if user owns the reservation or has admin privileges
    const userRole = session.user.role
    const isOwner = existingReservation.userId === session.user.id
    const canCancel = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !canCancel) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if reservation can be cancelled based on status
    const cancellableStatuses = ['PENDING', 'APPROVED']
    if (!cancellableStatuses.includes(existingReservation.status)) {
      return NextResponse.json(
        { 
          error: `Cannot cancel reservation with status: ${existingReservation.status}. Only pending or approved reservations can be cancelled.` 
        },
        { status: 400 }
      )
    }

    // Check if cancellation is too late (within 24 hours of start date)
    const now = new Date()
    const startDate = new Date(existingReservation.startDate)
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Calculate trust score impact based on timing
    let trustScoreImpact = 0
    let penaltyReason = ''

    if (hoursUntilStart < 24 && hoursUntilStart > 0) {
      // Late cancellation (less than 24 hours)
      trustScoreImpact = -5
      penaltyReason = 'Late cancellation (less than 24 hours notice)'
    } else if (hoursUntilStart <= 0) {
      // Very late cancellation (after start time)
      trustScoreImpact = -10
      penaltyReason = 'Very late cancellation (after scheduled start time)'
    }

    // Only apply penalty to borrowers, not admins
    const shouldApplyPenalty = trustScoreImpact < 0 && isOwner && !canCancel

    // Start a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the reservation status
      const cancelledReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: validatedData.notes || existingReservation.notes,
          updatedAt: new Date(),
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
              images: true,
              location: true,
              condition: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              trustScore: true,
            }
          },
        },
      })

      // Apply trust score penalty if applicable
      if (shouldApplyPenalty) {
        const newTrustScore = Math.max(0, existingReservation.user.trustScore + trustScoreImpact)
        
        await tx.user.update({
          where: { id: existingReservation.userId },
          data: { trustScore: newTrustScore }
        })

        // Record reputation history
        await tx.reputationHistory.create({
          data: {
            userId: existingReservation.userId,
            change: trustScoreImpact,
            reason: penaltyReason,
            previousScore: existingReservation.user.trustScore,
            newScore: newTrustScore,
          }
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CANCEL_RESERVATION',
          entityType: 'Reservation',
          entityId: id,
          userId: session.user.id,
          changes: {
            reason: validatedData.reason,
            cancellationTime: now,
            hoursBeforeStart: hoursUntilStart,
            trustScoreImpact: shouldApplyPenalty ? trustScoreImpact : 0,
            penaltyReason: shouldApplyPenalty ? penaltyReason : null,
            originalStatus: existingReservation.status,
            cancelledBy: isOwner ? 'owner' : 'admin'
          }
        }
      })

      return { 
        reservation: cancelledReservation, 
        trustScoreImpact: shouldApplyPenalty ? trustScoreImpact : 0,
        penaltyReason: shouldApplyPenalty ? penaltyReason : null
      }
    })

    return NextResponse.json({ 
      ...result,
      message: shouldApplyPenalty 
        ? `Reservation cancelled successfully. Trust score penalty applied: ${Math.abs(result.trustScoreImpact)} points.`
        : 'Reservation cancelled successfully.',
    })

  } catch (error) {
    console.error('Error cancelling reservation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}