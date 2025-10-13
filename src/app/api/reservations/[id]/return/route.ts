import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ItemCondition, ReturnStatus } from '@prisma/client'

interface Params {
  id: string
}

const returnRequestSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  conditionOnReturn: z.nativeEnum(ItemCondition).optional().default(ItemCondition.GOOD),
  damageReport: z.string().optional(),
  damageImages: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  returnDate: z.string().optional(), // If not provided, use current date
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: reservationId } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = returnRequestSchema.parse(body)

    // Find the reservation with all necessary data
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            condition: true,
            value: true,
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

    // Verify user permissions
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

   

    // Check if reservation is in correct status for return
    if (reservation.status !== 'ACTIVE') {
      return NextResponse.json(
        { 
          error: `Cannot initiate return for reservation with status: ${reservation.status}`,
          reservationStatus: reservation.status
        },
        { status: 400 }
      )
    }

    // Check if return already exists and is not completed
    const existingReturn = reservation.returns[0]
    if (existingReturn && existingReturn.status !== 'REJECTED') {
      return NextResponse.json(
        { 
          error: 'Return process already initiated for this reservation',
          existingReturn: {
            id: existingReturn.id,
            status: existingReturn.status,
            createdAt: existingReturn.createdAt
          }
        },
        { status: 400 }
      )
    }

    // Verify item ID matches reservation
    if (validatedData.itemId !== reservation.item.id) {
      return NextResponse.json(
        { error: 'Item ID does not match reservation' },
        { status: 400 }
      )
    }

    const returnDate = validatedData.returnDate 
      ? new Date(validatedData.returnDate) 
      : new Date()

    // Check if returning on time or late
    const dueDate = new Date(reservation.endDate)
    const isLate = returnDate > dueDate

    // Determine initial return status based on condition and timing
    let returnStatus: ReturnStatus = 'PENDING'
    
    // Auto-approve if good condition and on time, and user is staff
    if (validatedData.conditionOnReturn === ItemCondition.GOOD && !isLate) {
      returnStatus = 'APPROVED'
    }

    // If there's damage, always require approval
    if (validatedData.damageReport || validatedData.conditionOnReturn !== ItemCondition.GOOD) {
      returnStatus = 'PENDING'
    }

    // Start a transaction to create return and update related records
    const result = await prisma.$transaction(async (tx) => {
      // Create the return record
      const returnRecord = await tx.return.create({
        data: {
          reservationId: reservationId,
          userId: session.user.id,
          itemId: validatedData.itemId,
          returnDate: returnDate,
          conditionOnReturn: validatedData.conditionOnReturn,
          damageReport: validatedData.damageReport,
          damageImages: validatedData.damageImages,
          notes: validatedData.notes,
          status: returnStatus,
          ...(returnStatus === 'APPROVED' ? {
            approvedById: session.user.id,
            approvedAt: new Date(),
          } : {})
        },
        include: {
          reservation: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                }
              }
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

      // If auto-approved, update reservation status and item status
      if (returnStatus === 'APPROVED') {
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'COMPLETED' }
        })

        await tx.item.update({
          where: { id: validatedData.itemId },
          data: { 
            status: 'AVAILABLE',
            condition: validatedData.conditionOnReturn
          }
        })
      } else {
        // If pending approval, keep reservation as ACTIVE until return is approved
        // The reservation status will be updated when the return is approved via the returns API
      }

      return returnRecord
    })

    // Calculate response message based on status
    const responseMessage = returnStatus === 'APPROVED' 
      ? 'Item returned successfully'
      : 'Return request submitted and pending approval'

    return NextResponse.json({
      success: true,
      message: responseMessage,
      return: result,
      autoApproved: returnStatus === 'APPROVED'
    })

  } catch (error) {
    console.error('Error processing return:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'A return request for this reservation already exists' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('P2025')) {
        return NextResponse.json(
          { error: 'Reservation or item not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process return request' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: reservationId } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find return records for this reservation
    const returns = await prisma.return.findMany({
      where: { reservationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reservation: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                category: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (returns.length === 0) {
      return NextResponse.json(
        { error: 'No return records found for this reservation' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role
    const isOwner = returns[0].userId === session.user.id
    const canViewAll = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !canViewAll) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      returns: returns,
      latestReturn: returns[0]
    })

  } catch (error) {
    console.error('Error fetching return records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch return records' },
      { status: 500 }
    )
  }
}
