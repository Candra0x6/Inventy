import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ReturnStatus, ItemCondition } from '@prisma/client'

const confirmReturnSchema = z.object({
  approved: z.boolean(),
  staffAssessment: z.object({
    conditionOnReturn: z.nativeEnum(ItemCondition).optional(),
    damageReport: z.string().optional(),
    damageImages: z.array(z.string()).optional(),
    penaltyOverride: z.object({
      amount: z.number().min(0).max(100).optional(),
      reason: z.string().optional(),
    }).optional(),
  }).optional(),
  rejectionReason: z.string().optional(),
  staffNotes: z.string().optional(),
})

const updateReturnStatusSchema = z.object({
  status: z.nativeEnum(ReturnStatus),
  rejectionReason: z.string().optional(),
  staffNotes: z.string().optional(),
})

interface Params {
  id: string
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can confirm returns' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = confirmReturnSchema.parse(body)

    // Find the return record
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            condition: true,
            status: true,
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
        },
        reservation: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          }
        }
      }
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return record not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (returnRecord.status !== 'PENDING') {
      return NextResponse.json(
        { 
          error: `Return already processed with status: ${returnRecord.status}`,
          processedAt: returnRecord.approvedAt
        },
        { status: 400 }
      )
    }

    const now = new Date()
    let finalPenaltyAmount = returnRecord.penaltyAmount || 0
    let finalStatus: ReturnStatus = validatedData.approved ? 'APPROVED' : 'REJECTED'

    // Apply staff assessment if provided
    if (validatedData.staffAssessment) {
      const assessment = validatedData.staffAssessment

      // Recalculate penalty if staff overrides condition
      if (assessment.conditionOnReturn) {
        const originalCondition = returnRecord.item.condition
        const assessedCondition = assessment.conditionOnReturn
        const conditionDegraded = getConditionScore(assessedCondition) < getConditionScore(originalCondition)
        
        if (conditionDegraded) {
          const conditionPenalty = (getConditionScore(originalCondition) - getConditionScore(assessedCondition)) * 5
          finalPenaltyAmount = Math.max(finalPenaltyAmount, conditionPenalty)
        }

        // If damage is severe, mark as DAMAGED status
        if (assessedCondition === 'DAMAGED' || assessment.damageReport) {
          finalStatus = 'DAMAGED'
        }
      }

      // Apply penalty override if provided
      if (assessment.penaltyOverride?.amount !== undefined) {
        finalPenaltyAmount = assessment.penaltyOverride.amount
      }
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update return record
      const updatedReturn = await tx.return.update({
        where: { id },
        data: {
          status: finalStatus,
          approvedById: session.user.id,
          approvedAt: now,
          penaltyApplied: finalPenaltyAmount > 0,
          penaltyAmount: finalPenaltyAmount > 0 ? finalPenaltyAmount : null,
          penaltyReason: validatedData.staffAssessment?.penaltyOverride?.reason || returnRecord.penaltyReason,
          notes: validatedData.staffNotes ? 
            `${returnRecord.notes || ''}\n\nStaff Notes: ${validatedData.staffNotes}`.trim() : 
            returnRecord.notes,
          // Update condition if staff assessed differently
          conditionOnReturn: validatedData.staffAssessment?.conditionOnReturn || returnRecord.conditionOnReturn,
          damageReport: validatedData.staffAssessment?.damageReport || returnRecord.damageReport,
          damageImages: validatedData.staffAssessment?.damageImages || returnRecord.damageImages,
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              condition: true,
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
          },
          reservation: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
            }
          }
        }
      })

      if (validatedData.approved) {
        // Update reservation status to COMPLETED
        await tx.reservation.update({
          where: { id: returnRecord.reservationId },
          data: {
            status: 'COMPLETED',
            actualEndDate: returnRecord.returnDate,
          }
        })

        // Update item status and condition
        await tx.item.update({
          where: { id: returnRecord.itemId },
          data: {
            status: finalStatus === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
            condition: validatedData.staffAssessment?.conditionOnReturn || returnRecord.conditionOnReturn,
          }
        })

        // Apply trust score penalty if applicable
        if (finalPenaltyAmount > 0) {
          await tx.user.update({
            where: { id: returnRecord.userId },
            data: {
              trustScore: { decrement: finalPenaltyAmount }
            }
          })

          // Record reputation history
          await tx.reputationHistory.create({
            data: {
              userId: returnRecord.userId,
              change: -finalPenaltyAmount,
              reason: `Return penalty: ${updatedReturn.penaltyReason}`,
              previousScore: returnRecord.user.trustScore,
              newScore: returnRecord.user.trustScore - finalPenaltyAmount,
            }
          })
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: validatedData.approved ? 'APPROVE_RETURN' : 'REJECT_RETURN',
          entityType: 'Return',
          entityId: id,
          userId: session.user.id,
          changes: {
            approvedBy: session.user.email,
            approvedAt: now.toISOString(),
            previousStatus: 'PENDING',
            newStatus: finalStatus,
            penaltyApplied: finalPenaltyAmount,
            staffAssessment: validatedData.staffAssessment,
            rejectionReason: validatedData.rejectionReason,
            staffNotes: validatedData.staffNotes,
          }
        }
      })

      return updatedReturn
    })

    return NextResponse.json({
      message: validatedData.approved 
        ? 'Return approved successfully' 
        : 'Return rejected',
      return: result,
      actions: {
        reservationCompleted: validatedData.approved,
        itemStatusUpdated: validatedData.approved,
        trustScoreUpdated: finalPenaltyAmount > 0,
        penaltyApplied: finalPenaltyAmount,
      }
    })

  } catch (error) {
    console.error('Error confirming return:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm return' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve specific return details
export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true,
            condition: true,
            status: true,
            images: true,
            location: true,
            value: true,
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
        reservation: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            actualStartDate: true,
            actualEndDate: true,
            status: true,
            purpose: true,
          }
        }
      }
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return record not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role
    const isOwner = returnRecord.userId === session.user.id
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate return metrics
    const isOverdue = returnRecord.returnDate > returnRecord.reservation.endDate
    const daysOverdue = isOverdue 
      ? Math.ceil((returnRecord.returnDate.getTime() - returnRecord.reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const borrowDuration = Math.ceil(
      (returnRecord.returnDate.getTime() - returnRecord.reservation.actualStartDate!.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      return: returnRecord,
      metrics: {
        isOverdue,
        daysOverdue,
        borrowDuration,
        conditionDegraded: getConditionScore(returnRecord.conditionOnReturn) < getConditionScore(returnRecord.item.condition),
        penaltyApplied: returnRecord.penaltyApplied,
        requiresApproval: returnRecord.status === 'PENDING',
      },
      timeline: {
        borrowed: returnRecord.reservation.actualStartDate?.toISOString(),
        dueDate: returnRecord.reservation.endDate.toISOString(),
        returned: returnRecord.returnDate.toISOString(),
        processed: returnRecord.approvedAt?.toISOString(),
      }
    })

  } catch (error) {
    console.error('Error fetching return details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch return details' },
      { status: 500 }
    )
  }
}

// Helper function to convert condition to numeric score for comparison
function getConditionScore(condition: ItemCondition): number {
  const scores = {
    EXCELLENT: 5,
    GOOD: 4,
    FAIR: 3,
    POOR: 2,
    DAMAGED: 1,
  }
  return scores[condition] || 0
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

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can update return status' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateReturnStatusSchema.parse(body)

    // Get the return record
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            condition: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            trustScore: true,
          }
        },
        reservation: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          }
        }
      }
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return not found' },
        { status: 404 }
      )
    }

    // Update return status
    const updatedReturn = await prisma.$transaction(async (tx) => {
      const updateData: {
        status: ReturnStatus
        updatedAt: Date
        approvedById?: string
        approvedAt?: Date
        notes?: string
      } = {
        status: validatedData.status,
        updatedAt: new Date(),
      }

      if (validatedData.status === 'APPROVED') {
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      }

      if (validatedData.rejectionReason) {
        updateData.notes = validatedData.rejectionReason
      }

      if (validatedData.staffNotes) {
        updateData.notes = validatedData.staffNotes
      }

      const updated = await tx.return.update({
        where: { id },
        data: updateData,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              condition: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              trustScore: true,
            }
          },
          reservation: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
            }
          }
        }
      })

      // If approved, update reservation status
      if (validatedData.status === 'APPROVED') {
        await tx.reservation.update({
          where: { id: returnRecord.reservation.id },
          data: { status: 'COMPLETED' }
        })

        // Update item status back to available
        await tx.item.update({
          where: { id: returnRecord.item.id },
          data: { status: 'AVAILABLE' }
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: `RETURN_${validatedData.status}`,
          entityType: 'Return',
          entityId: id,
          userId: session.user.id,
          changes: {
            status: validatedData.status,
            previousStatus: returnRecord.status,
            rejectionReason: validatedData.rejectionReason,
            staffNotes: validatedData.staffNotes,
            processedBy: session.user.email,
            processedAt: new Date().toISOString(),
          }
        }
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      return: updatedReturn,
      message: `Return ${validatedData.status.toLowerCase()} successfully`
    })

  } catch (error) {
    console.error('Error updating return status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update return status' },
      { status: 500 }
    )
  }
}