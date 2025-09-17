import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const modifyReservationSchema = z.object({
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
  reason: z.string().min(1, 'Reason for modification is required'),
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
    const validatedData = modifyReservationSchema.parse(body)

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
    const canModify = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !canModify) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if reservation can be modified based on status
    const modifiableStatuses = ['PENDING', 'APPROVED']
    if (!modifiableStatuses.includes(existingReservation.status)) {
      return NextResponse.json(
        { 
          error: `Cannot modify reservation with status: ${existingReservation.status}. Only pending or approved reservations can be modified.` 
        },
        { status: 400 }
      )
    }

    // Validate dates
    const newStartDate = new Date(validatedData.startDate)
    const newEndDate = new Date(validatedData.endDate)
    const now = new Date()

    if (newStartDate >= newEndDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    if (newStartDate < now) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      )
    }

    // Check for date conflicts with other reservations
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        id: { not: id },
        itemId: existingReservation.itemId,
        status: {
          in: ['PENDING', 'APPROVED', 'ACTIVE']
        },
        OR: [
          {
            AND: [
              { startDate: { lte: newEndDate } },
              { endDate: { gte: newStartDate } }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        { 
          error: 'Item is not available for the selected dates',
          conflicts: conflictingReservations.map(r => ({
            id: r.id,
            startDate: r.startDate,
            endDate: r.endDate,
            user: r.user.name || r.user.email,
            status: r.status
          }))
        },
        { status: 409 }
      )
    }

    // Check if modification requires re-approval
    const significantChange = 
      Math.abs(newStartDate.getTime() - existingReservation.startDate.getTime()) > 24 * 60 * 60 * 1000 || // More than 1 day change
      Math.abs(newEndDate.getTime() - existingReservation.endDate.getTime()) > 24 * 60 * 60 * 1000

    const newStatus = (existingReservation.status === 'APPROVED' && significantChange && isOwner && !canModify) 
      ? 'PENDING' 
      : existingReservation.status

    // Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
        purpose: validatedData.purpose || existingReservation.purpose,
        notes: validatedData.notes || existingReservation.notes,
        status: newStatus,
        updatedAt: new Date(),
        // Clear approval if status changed back to pending
        ...(newStatus === 'PENDING' && {
          approvedById: null,
          approvedAt: null,
        })
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
          }
        },
      },
    })

    // Create audit log for the modification
    await prisma.auditLog.create({
      data: {
        action: 'MODIFY_RESERVATION',
        entityType: 'Reservation',
        entityId: id,
        userId: session.user.id,
        changes: {
          reason: validatedData.reason,
          previousStartDate: existingReservation.startDate,
          newStartDate: newStartDate,
          previousEndDate: existingReservation.endDate,
          newEndDate: newEndDate,
          statusChange: existingReservation.status !== newStatus ? {
            from: existingReservation.status,
            to: newStatus
          } : null,
          requiresReapproval: newStatus === 'PENDING'
        }
      }
    })

    return NextResponse.json({ 
      reservation: updatedReservation,
      message: newStatus === 'PENDING' 
        ? 'Reservation modified successfully. Re-approval required due to significant date changes.'
        : 'Reservation modified successfully.',
      requiresReapproval: newStatus === 'PENDING'
    })

  } catch (error) {
    console.error('Error modifying reservation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to modify reservation' },
      { status: 500 }
    )
  }
}