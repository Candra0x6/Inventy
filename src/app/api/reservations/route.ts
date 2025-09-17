import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'
import { z } from 'zod'

const createReservationSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  startDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Invalid start date'
  ),
  endDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Invalid end date'
  ),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})

// Schema for updating reservations (used in individual reservation routes)
export const updateReservationSchema = z.object({
  startDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Invalid start date'
  ).optional(),
  endDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)), 
    'Invalid end date'
  ).optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  rejectionReason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const itemId = searchParams.get('itemId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') as ReservationStatus | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    interface WhereClause {
      itemId?: string
      userId?: string
      status?: ReservationStatus
      AND?: Array<{
        OR: Array<{
          startDate?: { gte?: Date; lte?: Date }
          endDate?: { gte?: Date; lte?: Date }
        }>
      }>
    }
    
    const where: WhereClause = {}

    if (itemId) {
      where.itemId = itemId
    }

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    // Date range filtering
    if (startDate || endDate) {
      where.AND = []
      if (startDate) {
        where.AND.push({
          OR: [
            { startDate: { gte: new Date(startDate) } },
            { endDate: { gte: new Date(startDate) } }
          ]
        })
      }
      if (endDate) {
        where.AND.push({
          OR: [
            { startDate: { lte: new Date(endDate) } },
            { endDate: { lte: new Date(endDate) } }
          ]
        })
      }
    }

    // Role-based filtering
    const userRole = session.user.role
    if (userRole === 'BORROWER') {
      // Borrowers can only see their own reservations
      where.userId = session.user.id
    }

    const skip = (page - 1) * limit

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
              images: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ])

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
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

    const body = await request.json()
    const validatedData = createReservationSchema.parse(body)

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      )
    }

    // Check if item exists and is available
    const item = await prisma.item.findUnique({
      where: { id: validatedData.itemId },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'ACTIVE']
            },
            OR: [
              {
                AND: [
                  { startDate: { lte: endDate } },
                  { endDate: { gte: startDate } }
                ]
              }
            ]
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (item.status === 'RETIRED') {
      return NextResponse.json(
        { error: 'Item is no longer available' },
        { status: 400 }
      )
    }

    // Check for conflicting reservations
    if (item.reservations.length > 0) {
      return NextResponse.json(
        { 
          error: 'Item is not available for the selected dates',
          conflictingReservations: item.reservations
        },
        { status: 409 }
      )
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        itemId: validatedData.itemId,
        userId: session.user.id,
        startDate,
        endDate,
        purpose: validatedData.purpose,
        notes: validatedData.notes,
        status: 'PENDING',
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
            images: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
      },
    })

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error('Error creating reservation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}