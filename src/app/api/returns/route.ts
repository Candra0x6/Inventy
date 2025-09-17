import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ItemCondition } from '@prisma/client'

const createReturnSchema = z.object({
  reservationId: z.string().min(1, 'Reservation ID is required'),
  returnDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Valid return date is required'
  }),
  conditionOnReturn: z.nativeEnum(ItemCondition),
  damageReport: z.string().optional(),
  damageImages: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
})

const querySchema = z.object({
  reservationId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DAMAGED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createReturnSchema.parse(body)

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: validatedData.reservationId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            condition: true,
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
        returns: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Verify reservation belongs to user or user is staff
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'Access denied. Can only initiate returns for your own reservations' },
        { status: 403 }
      )
    }

    // Check if reservation is in correct status
    if (reservation.status !== 'ACTIVE') {
      return NextResponse.json(
        { 
          error: `Cannot initiate return for reservation with status: ${reservation.status}` 
        },
        { status: 400 }
      )
    }

    // Check if return already exists
    if (reservation.returns.length > 0) {
      return NextResponse.json(
        { 
          error: 'Return process already initiated for this reservation',
          existingReturn: reservation.returns[0]
        },
        { status: 400 }
      )
    }

    const returnDate = new Date(validatedData.returnDate)
    const now = new Date()

    // Check if return date is valid
    if (returnDate > now) {
      return NextResponse.json(
        { error: 'Return date cannot be in the future' },
        { status: 400 }
      )
    }

    // Calculate if return is overdue
    const isOverdue = returnDate > reservation.endDate
    const daysOverdue = isOverdue 
      ? Math.ceil((returnDate.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Determine if condition has degraded
    const originalCondition = reservation.item.condition
    const returnCondition = validatedData.conditionOnReturn
    const conditionDegraded = getConditionScore(returnCondition) < getConditionScore(originalCondition)

    // Calculate initial penalty
    let penaltyAmount = 0
    let penaltyReason = ''
    
    if (isOverdue) {
      penaltyAmount += Math.min(daysOverdue * 2, 20) // 2 points per day, max 20
      penaltyReason += `Overdue return (${daysOverdue} days late). `
    }

    if (conditionDegraded) {
      const conditionPenalty = (getConditionScore(originalCondition) - getConditionScore(returnCondition)) * 5
      penaltyAmount += conditionPenalty
      penaltyReason += `Condition degraded from ${originalCondition} to ${returnCondition}. `
    }

    // Create return record
    const returnRecord = await prisma.$transaction(async (tx) => {
      const newReturn = await tx.return.create({
        data: {
          reservationId: validatedData.reservationId,
          itemId: reservation.item.id,
          userId: reservation.userId,
          returnDate,
          conditionOnReturn: validatedData.conditionOnReturn,
          status: conditionDegraded || isOverdue || validatedData.damageReport ? 'PENDING' : 'APPROVED',
          damageReport: validatedData.damageReport,
          damageImages: validatedData.damageImages,
          penaltyApplied: penaltyAmount > 0,
          penaltyReason: penaltyReason || null,
          penaltyAmount: penaltyAmount > 0 ? penaltyAmount : null,
          notes: validatedData.notes,
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
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

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'INITIATE_RETURN',
          entityType: 'Return',
          entityId: newReturn.id,
          userId: session.user.id,
          changes: {
            initiatedBy: session.user.email,
            reservationId: validatedData.reservationId,
            returnDate: returnDate.toISOString(),
            conditionOnReturn: validatedData.conditionOnReturn,
            originalCondition,
            isOverdue,
            daysOverdue,
            conditionDegraded,
            penaltyAmount,
            penaltyReason,
            damageReported: !!validatedData.damageReport,
          }
        }
      })

      return newReturn
    })

    return NextResponse.json({
      message: 'Return initiated successfully',
      return: returnRecord,
      assessment: {
        isOverdue,
        daysOverdue,
        conditionDegraded,
        penaltyAmount,
        requiresApproval: returnRecord.status === 'PENDING',
      }
    })

  } catch (error) {
    console.error('Error creating return:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate return' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    // Build where clause based on permissions and filters
    const where: {
      userId?: string
      reservationId?: string
      status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DAMAGED'
    } = {}

    // Add user filter for non-staff users
    if (!isStaff) {
      where.userId = session.user.id
    } else if (query.userId) {
      where.userId = query.userId
    }

    // Add other filters
    if (query.reservationId) {
      where.reservationId = query.reservationId
    }

    if (query.status) {
      where.status = query.status
    }

    const skip = (query.page - 1) * query.limit

    const [returns, totalCount] = await Promise.all([
      prisma.return.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              condition: true,
              images: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              trustScore: true,
            }
          },
          reservation: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              purpose: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.return.count({ where })
    ])

    return NextResponse.json({
      returns,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit),
      }
    })

  } catch (error) {
    console.error('Error fetching returns:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch returns' },
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