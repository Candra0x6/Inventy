import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'
import { updateReservationSchema } from '../route'

interface Params {
  id: string
}

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
        returns: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    const userRole = session.user.role
    const isOwner = reservation.userId === session.user.id
    const canViewAll = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !canViewAll) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
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
    const validatedData = updateReservationSchema.parse(body)

    // Find the existing reservation
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        item: true,
        user: true,
      }
    })

    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    const userRole = session.user.role
    const isOwner = existingReservation.userId === session.user.id
    const canManage = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    // Check permissions for different operations
    const isStatusChange = validatedData.status && validatedData.status !== existingReservation.status
    
    if (isStatusChange && !canManage) {
      return NextResponse.json(
        { error: 'Only administrators can change reservation status' },
        { status: 403 }
      )
    }

    if (!isOwner && !canManage) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: {
      startDate?: Date
      endDate?: Date
      purpose?: string
      notes?: string
      status?: ReservationStatus
      approvedById?: string
      approvedAt?: Date
      rejectionReason?: string
    } = {}

    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate)
    }

    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate)
    }

    if (validatedData.purpose !== undefined) {
      updateData.purpose = validatedData.purpose
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    if (validatedData.status) {
      updateData.status = validatedData.status
      
      // Set approval/rejection metadata
      if (validatedData.status === 'ACTIVE') {
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      } else if (validatedData.status === 'REJECTED') {
        updateData.rejectionReason = validatedData.rejectionReason
      }
    }

    // Validate date changes
    const newStartDate = updateData.startDate || existingReservation.startDate
    const newEndDate = updateData.endDate || existingReservation.endDate

    if (newStartDate >= newEndDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Check for conflicts if dates are being changed
    if (updateData.startDate || updateData.endDate) {
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
        }
      })

      if (conflictingReservations.length > 0) {
        return NextResponse.json(
          { 
            error: 'Item is not available for the selected dates',
            conflictingReservations
          },
          { status: 409 }
        )
      }
    }

    // Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ reservation: updatedReservation })
  } catch (error) {
    console.error('Error updating reservation:', error)
    
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A reservation conflict occurred' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the existing reservation
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        startDate: true,
      }
    })

    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    const userRole = session.user.role
    const isOwner = existingReservation.userId === session.user.id
    const canDelete = ['SUPER_ADMIN', 'MANAGER'].includes(userRole)

    if (!isOwner && !canDelete) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prevent deletion of active reservations by borrowers
    if (isOwner && !canDelete && existingReservation.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot delete active reservations. Please return the item first.' },
        { status: 400 }
      )
    }

    // Delete the reservation
    await prisma.reservation.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Reservation deleted successfully' })
  } catch (error) {
    console.error('Error deleting reservation:', error)
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    )
  }
}