import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Type for pickup QR token data stored in audit logs
interface PickupTokenData {
  token: string
  expiresAt: string
  generatedBy: string
  generatedAt: string
}

const confirmPickupSchema = z.object({
  token: z.string().min(1, 'Pickup token is required'),
  confirmationCode: z.string().optional(), // Optional manual confirmation code
  staffId: z.string().optional(), // Staff member confirming pickup
  notes: z.string().optional(),
})

interface Params {
  id: string
}

export async function POST(
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
    const validatedData = confirmPickupSchema.parse(body)

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            status: true,
            location: true,
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

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Check if reservation is in correct status
    if (reservation.status !== 'APPROVED') {
      return NextResponse.json(
        { 
          error: `Cannot confirm pickup for reservation with status: ${reservation.status}` 
        },
        { status: 400 }
      )
    }

    // Check if already picked up
    if (reservation.pickupConfirmed) {
      return NextResponse.json(
        { 
          error: 'Item has already been picked up',
          pickupConfirmedAt: reservation.pickupConfirmedAt
        },
        { status: 400 }
      )
    }

    // Verify the pickup token
    const tokenAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'GENERATE_PICKUP_QR',
        entityType: 'Reservation',
        entityId: id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!tokenAuditLog) {
      return NextResponse.json(
        { error: 'No valid pickup QR code found. Please generate a new QR code.' },
        { status: 400 }
      )
    }

    const tokenData = tokenAuditLog.changes as unknown as PickupTokenData
    const storedToken = tokenData?.token
    const expiresAt = new Date(tokenData?.expiresAt)

    // Verify token matches
    if (storedToken !== validatedData.token) {
      return NextResponse.json(
        { error: 'Invalid pickup token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Pickup QR code has expired. Please generate a new one.' },
        { status: 400 }
      )
    }

    // Permission check for confirmation
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    // Determine who can confirm pickup
    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'Only the borrower or staff can confirm pickup' },
        { status: 403 }
      )
    }

    const now = new Date()

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update reservation status
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          pickupConfirmed: true,
          pickupConfirmedAt: now,
          status: 'ACTIVE',
          actualStartDate: now,
          notes: validatedData.notes || reservation.notes,
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

      // Update item status to BORROWED
      await tx.item.update({
        where: { id: reservation.item.id },
        data: { status: 'BORROWED' }
      })

      // Create pickup confirmation audit log
      await tx.auditLog.create({
        data: {
          action: 'CONFIRM_PICKUP',
          entityType: 'Reservation',
          entityId: id,
          userId: session.user.id,
          changes: {
            confirmedBy: session.user.email,
            confirmedAt: now.toISOString(),
            staffId: validatedData.staffId,
            isStaffConfirmation: isStaff,
            isSelfConfirmation: isOwner,
            previousStatus: reservation.status,
            newStatus: 'ACTIVE',
            token: validatedData.token,
            notes: validatedData.notes
          }
        }
      })

      return updatedReservation
    })

    return NextResponse.json({
      message: 'Pickup confirmed successfully',
      reservation: result,
      pickupDetails: {
        confirmedAt: now.toISOString(),
        confirmedBy: session.user.email,
        isStaffConfirmation: isStaff,
      }
    })

  } catch (error) {
    console.error('Error confirming pickup:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm pickup' },
      { status: 500 }
    )
  }
}

// GET endpoint to check pickup status
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

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        pickupConfirmed: true,
        pickupConfirmedAt: true,
        startDate: true,
        actualStartDate: true,
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const canView = isOwner || ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get latest pickup QR generation log
    const latestQRLog = await prisma.auditLog.findFirst({
      where: {
        action: 'GENERATE_PICKUP_QR',
        entityType: 'Reservation',
        entityId: id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let qrStatus = 'not_generated'
    let qrExpiresAt = null

    if (latestQRLog) {
      const tokenData = latestQRLog.changes as unknown as PickupTokenData
      const expiresAt = new Date(tokenData?.expiresAt)
      const now = new Date()
      
      if (now > expiresAt) {
        qrStatus = 'expired'
      } else {
        qrStatus = 'valid'
      }
      qrExpiresAt = expiresAt.toISOString()
    }

    return NextResponse.json({
      pickupStatus: {
        isConfirmed: reservation.pickupConfirmed,
        confirmedAt: reservation.pickupConfirmedAt?.toISOString(),
        canConfirm: reservation.status === 'APPROVED' && !reservation.pickupConfirmed,
        reservationStatus: reservation.status,
      },
      qrCodeStatus: {
        status: qrStatus,
        expiresAt: qrExpiresAt,
        needsNewQR: qrStatus === 'not_generated' || qrStatus === 'expired',
      },
      timeline: {
        scheduledStart: reservation.startDate.toISOString(),
        actualStart: reservation.actualStartDate?.toISOString(),
        isOverdue: !reservation.pickupConfirmed && new Date() > reservation.startDate,
      }
    })

  } catch (error) {
    console.error('Error checking pickup status:', error)
    return NextResponse.json(
      { error: 'Failed to check pickup status' },
      { status: 500 }
    )
  }
}
