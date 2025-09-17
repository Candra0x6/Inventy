import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkApproveSchema = z.object({
  returnIds: z.array(z.string()).min(1, 'At least one return ID is required'),
  staffNotes: z.string().optional(),
})

const bulkRejectSchema = z.object({
  returnIds: z.array(z.string()).min(1, 'At least one return ID is required'),
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
  staffNotes: z.string().optional(),
})

const overdueProcessingSchema = z.object({
  daysOverdue: z.number().min(1).max(365).default(1),
  autoInitiateReturns: z.boolean().default(false),
  penaltyMultiplier: z.number().min(0.5).max(3).default(1),
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
        { error: 'Only staff can perform bulk return operations' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const operation = url.searchParams.get('operation')

    switch (operation) {
      case 'approve-multiple':
        return await approveMultipleReturns(request, session)
      case 'reject-multiple':
        return await rejectMultipleReturns(request, session)
      case 'process-overdue':
        return await processOverdueItems(request, session)
      case 'generate-report':
        return await generateReturnReport(request, session)
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: approve-multiple, reject-multiple, process-overdue, or generate-report' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in bulk return operations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function approveMultipleReturns(request: NextRequest, session: any) {
  const body = await request.json()
  const validatedData = bulkApproveSchema.parse(body)

  const results = await Promise.allSettled(
    validatedData.returnIds.map(async (returnId) => {
      try {
        const returnRecord = await prisma.return.findUnique({
          where: { id: returnId },
          include: {
            item: true,
            user: { select: { id: true, name: true, email: true, trustScore: true } },
            reservation: true
          }
        })

        if (!returnRecord) {
          throw new Error(`Return ${returnId} not found`)
        }

        if (returnRecord.status !== 'PENDING') {
          throw new Error(`Return ${returnId} is not pending (status: ${returnRecord.status})`)
        }

        const now = new Date()

        // Update return and related entities
        await prisma.$transaction(async (tx) => {
          // Update return status
          await tx.return.update({
            where: { id: returnId },
            data: {
              status: 'APPROVED',
              approvedById: session.user.id,
              approvedAt: now,
              notes: validatedData.staffNotes ? 
                `${returnRecord.notes || ''}\n\nBulk Approval Notes: ${validatedData.staffNotes}`.trim() : 
                returnRecord.notes,
            }
          })

          // Update reservation status
          await tx.reservation.update({
            where: { id: returnRecord.reservationId },
            data: {
              status: 'COMPLETED',
              actualEndDate: returnRecord.returnDate,
            }
          })

          // Update item status
          await tx.item.update({
            where: { id: returnRecord.itemId },
            data: {
              status: returnRecord.conditionOnReturn === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
              condition: returnRecord.conditionOnReturn,
            }
          })

          // Apply penalty if exists
          if (returnRecord.penaltyApplied && returnRecord.penaltyAmount) {
            await tx.user.update({
              where: { id: returnRecord.userId },
              data: {
                trustScore: { decrement: returnRecord.penaltyAmount }
              }
            })

            await tx.reputationHistory.create({
              data: {
                userId: returnRecord.userId,
                change: -returnRecord.penaltyAmount,
                reason: `Bulk approval penalty: ${returnRecord.penaltyReason}`,
                previousScore: returnRecord.user.trustScore,
                newScore: returnRecord.user.trustScore - returnRecord.penaltyAmount,
              }
            })
          }

          // Create audit log
          await tx.auditLog.create({
            data: {
              action: 'BULK_APPROVE_RETURN',
              entityType: 'Return',
              entityId: returnId,
              userId: session.user.id,
              changes: {
                approvedBy: session.user.email,
                approvedAt: now.toISOString(),
                bulkOperation: true,
                staffNotes: validatedData.staffNotes,
                penaltyApplied: returnRecord.penaltyAmount || 0,
              }
            }
          })
        })

        return {
          id: returnId,
          success: true,
          item: returnRecord.item.name,
          user: returnRecord.user.name,
          penalty: returnRecord.penaltyAmount || 0,
        }
      } catch (error) {
        return {
          id: returnId,
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
    message: `Processed ${processed.length} returns`,
    summary: {
      total: processed.length,
      approved: successful.length,
      failed: failed.length,
      totalPenalties: successful.reduce((sum, r) => sum + (r.penalty || 0), 0),
    },
    successful,
    failed,
  })
}

async function rejectMultipleReturns(request: NextRequest, session: any) {
  const body = await request.json()
  const validatedData = bulkRejectSchema.parse(body)

  const results = await Promise.allSettled(
    validatedData.returnIds.map(async (returnId) => {
      try {
        const returnRecord = await prisma.return.findUnique({
          where: { id: returnId },
          include: {
            item: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } }
          }
        })

        if (!returnRecord) {
          throw new Error(`Return ${returnId} not found`)
        }

        if (returnRecord.status !== 'PENDING') {
          throw new Error(`Return ${returnId} is not pending (status: ${returnRecord.status})`)
        }

        const now = new Date()

        await prisma.$transaction(async (tx) => {
          await tx.return.update({
            where: { id: returnId },
            data: {
              status: 'REJECTED',
              approvedById: session.user.id,
              approvedAt: now,
              notes: `${returnRecord.notes || ''}\n\nRejection Reason: ${validatedData.rejectionReason}\n\nStaff Notes: ${validatedData.staffNotes || ''}`.trim(),
            }
          })

          // Create audit log
          await tx.auditLog.create({
            data: {
              action: 'BULK_REJECT_RETURN',
              entityType: 'Return',
              entityId: returnId,
              userId: session.user.id,
              changes: {
                rejectedBy: session.user.email,
                rejectedAt: now.toISOString(),
                bulkOperation: true,
                rejectionReason: validatedData.rejectionReason,
                staffNotes: validatedData.staffNotes,
              }
            }
          })
        })

        return {
          id: returnId,
          success: true,
          item: returnRecord.item.name,
          user: returnRecord.user.name,
        }
      } catch (error) {
        return {
          id: returnId,
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
    message: `Rejected ${successful.length} returns`,
    summary: {
      total: processed.length,
      rejected: successful.length,
      failed: failed.length,
    },
    successful,
    failed,
  })
}

async function processOverdueItems(request: NextRequest, session: any) {
  const body = await request.json()
  const validatedData = overdueProcessingSchema.parse(body)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - validatedData.daysOverdue)

  // Find overdue reservations without returns
  const overdueReservations = await prisma.reservation.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: cutoffDate },
      returns: { none: {} },
    },
    include: {
      item: { select: { id: true, name: true, condition: true } },
      user: { select: { id: true, name: true, email: true, trustScore: true } }
    }
  })

  if (overdueReservations.length === 0) {
    return NextResponse.json({
      message: 'No overdue items found',
      count: 0,
      processed: []
    })
  }

  const processed = await Promise.allSettled(
    overdueReservations.map(async (reservation) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const basePenalty = Math.min(daysOverdue * 2, 30) // 2 points per day, max 30
      const finalPenalty = basePenalty * validatedData.penaltyMultiplier

      await prisma.$transaction(async (tx) => {
        if (validatedData.autoInitiateReturns) {
          // Auto-create return record
          await tx.return.create({
            data: {
              reservationId: reservation.id,
              itemId: reservation.item.id,
              userId: reservation.userId,
              returnDate: new Date(), // Mark as returned today
              conditionOnReturn: reservation.item.condition, // Assume same condition
              status: 'PENDING',
              penaltyApplied: true,
              penaltyReason: `Auto-initiated return for overdue item (${daysOverdue} days late)`,
              penaltyAmount: finalPenalty,
              notes: `Auto-generated return for overdue item. System penalty applied.`,
            }
          })
        }

        // Apply penalty to user
        await tx.user.update({
          where: { id: reservation.userId },
          data: {
            trustScore: { decrement: finalPenalty }
          }
        })

        // Record reputation history
        await tx.reputationHistory.create({
          data: {
            userId: reservation.userId,
            change: -finalPenalty,
            reason: `Overdue item penalty: ${reservation.item.name} (${daysOverdue} days late)`,
            previousScore: reservation.user.trustScore,
            newScore: reservation.user.trustScore - finalPenalty,
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'PROCESS_OVERDUE_ITEM',
            entityType: 'Reservation',
            entityId: reservation.id,
            userId: session.user.id,
            changes: {
              processedBy: session.user.email,
              daysOverdue,
              penaltyApplied: finalPenalty,
              autoReturnInitiated: validatedData.autoInitiateReturns,
              originalEndDate: reservation.endDate.toISOString(),
            }
          }
        })
      })

      return {
        reservationId: reservation.id,
        item: reservation.item.name,
        user: reservation.user.name,
        daysOverdue,
        penaltyApplied: finalPenalty,
        autoReturnInitiated: validatedData.autoInitiateReturns,
      }
    })
  )

  const results = processed.map(result => 
    result.status === 'fulfilled' ? result.value : null
  ).filter(Boolean)

  return NextResponse.json({
    message: `Processed ${results.length} overdue items`,
    count: results.length,
    processed: results,
    summary: {
      totalPenalties: results.reduce((sum, r) => sum + (r?.penaltyApplied || 0), 0),
      autoReturnsCreated: validatedData.autoInitiateReturns ? results.length : 0,
      averageDaysOverdue: results.length > 0 
        ? results.reduce((sum, r) => sum + (r?.daysOverdue || 0), 0) / results.length 
        : 0,
    }
  })
}

async function generateReturnReport(request: NextRequest, session: any) {
  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') || '30')
  const includeDetails = url.searchParams.get('details') === 'true'

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get comprehensive return statistics
  const [
    returnStats,
    penaltyStats,
    userStats,
    itemStats,
    recentReturns
  ] = await Promise.all([
    prisma.return.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: true
    }),
    prisma.return.aggregate({
      where: {
        createdAt: { gte: startDate },
        penaltyApplied: true,
      },
      _sum: { penaltyAmount: true },
      _avg: { penaltyAmount: true },
      _count: { penaltyAmount: true },
    }),
    prisma.user.findMany({
      where: {
        returns: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        trustScore: true,
        _count: {
          select: {
            returns: {
              where: { createdAt: { gte: startDate } }
            }
          }
        }
      },
      orderBy: {
        returns: {
          _count: 'desc'
        }
      },
      take: includeDetails ? 50 : 10
    }),
    prisma.item.findMany({
      where: {
        returns: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      },
      select: {
        id: true,
        name: true,
        category: true,
        condition: true,
        _count: {
          select: {
            returns: {
              where: { createdAt: { gte: startDate } }
            }
          }
        }
      },
      orderBy: {
        returns: {
          _count: 'desc'
        }
      },
      take: includeDetails ? 50 : 10
    }),
    prisma.return.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        item: { select: { name: true, category: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: includeDetails ? 100 : 20
    })
  ])

  const report = {
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    },
    summary: {
      totalReturns: returnStats.reduce((sum, stat) => sum + stat._count, 0),
      pendingReturns: returnStats.find(s => s.status === 'PENDING')?._count || 0,
      approvedReturns: returnStats.find(s => s.status === 'APPROVED')?._count || 0,
      rejectedReturns: returnStats.find(s => s.status === 'REJECTED')?._count || 0,
      damagedReturns: returnStats.find(s => s.status === 'DAMAGED')?._count || 0,
    },
    penalties: {
      totalAmount: penaltyStats._sum.penaltyAmount || 0,
      averageAmount: penaltyStats._avg.penaltyAmount || 0,
      penaltyRate: returnStats.reduce((sum, stat) => sum + stat._count, 0) > 0
        ? ((penaltyStats._count.penaltyAmount || 0) / returnStats.reduce((sum, stat) => sum + stat._count, 0) * 100).toFixed(1)
        : '0.0'
    },
    topUsers: userStats,
    topItems: itemStats,
    recentActivity: includeDetails ? recentReturns : recentReturns.slice(0, 10),
    generatedAt: new Date().toISOString(),
    generatedBy: session.user.email,
  }

  return NextResponse.json(report)
}