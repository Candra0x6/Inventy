import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ItemStatus, Reservation } from '@prisma/client'

type StatusChangeData = {
  field: string
  from: string
  to: string
  reason: string
  timestamp: string
}

type ReservationWithUser = Reservation & {
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update item status (Manager, Super Admin, or Staff)
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, reason, forceUpdate } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    if (!status || !Object.values(ItemStatus).includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required', 
        validStatuses: Object.values(ItemStatus) 
      }, { status: 400 })
    }

    // Fetch the current item to validate organization and get current status
    const currentItem = await prisma.item.findFirst({
      where: {
        id,
      },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'ACTIVE']
            }
          },
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
      }
    })

    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Validate status transitions
    const validationResult = validateStatusTransition(
      currentItem.status,
      status,
      currentItem.reservations,
      forceUpdate
    )

    if (!validationResult.isValid) {
      return NextResponse.json({ 
        error: validationResult.error,
        suggestion: validationResult.suggestion,
        conflictingReservations: validationResult.conflictingReservations
      }, { status: 400 })
    }

    // Start transaction to update item status and create audit log
    const result = await prisma.$transaction(async (tx) => {
      // Update the item status
      const updatedItem = await tx.item.update({
        where: { id },
        data: { 
          status,
          updatedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_STATUS',
          entityType: 'Item',
          entityId: id,
          userId: session.user.id,
          changes: {
            field: 'status',
            from: currentItem.status,
            to: status,
            reason: reason || 'No reason provided',
            timestamp: new Date().toISOString()
          },
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Handle automatic reservation updates if needed
      if (validationResult.requiresReservationUpdate) {
        await handleReservationUpdates(tx, currentItem.reservations, status)
      }

      return updatedItem
    })

    return NextResponse.json({
      success: true,
      item: result,
      message: `Item status updated to ${status}`,
      previousStatus: currentItem.status
    })

  } catch (error) {
    console.error('Error updating item status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Get status history from audit logs
    const statusHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'Item',
        entityId: id,
        action: 'UPDATE_STATUS',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 status changes
    })

    // Get current item status
    const currentItem = await prisma.item.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true
      }
    })

    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({
      currentStatus: currentItem.status,
      lastUpdated: currentItem.updatedAt,
      statusHistory: statusHistory.map(log => ({
        id: log.id,
        from: (log.changes as StatusChangeData)?.from,
        to: (log.changes as StatusChangeData)?.to,
        reason: (log.changes as StatusChangeData)?.reason,
        changedAt: log.createdAt,
        ipAddress: log.ipAddress
      })),
      availableStatuses: Object.values(ItemStatus)
    })

  } catch (error) {
    console.error('Error fetching item status history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to validate status transitions
function validateStatusTransition(
  currentStatus: ItemStatus,
  newStatus: ItemStatus,
  activeReservations: ReservationWithUser[],
  forceUpdate: boolean = false
): {
  isValid: boolean
  error?: string
  suggestion?: string
  conflictingReservations?: ReservationWithUser[]
  requiresReservationUpdate?: boolean
} {
  // If forcing update, allow any transition (admin override)
  if (forceUpdate) {
    return { 
      isValid: true, 
      requiresReservationUpdate: activeReservations.length > 0 
    }
  }

  // Define valid transitions
  const validTransitions: Record<ItemStatus, ItemStatus[]> = {
    'AVAILABLE': ['RESERVED', 'BORROWED', 'MAINTENANCE', 'RETIRED'],
    'RESERVED': ['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'RETIRED'],
    'BORROWED': ['AVAILABLE', 'MAINTENANCE', 'RETIRED'],
    'MAINTENANCE': ['AVAILABLE', 'RETIRED'],
    'RETIRED': ['AVAILABLE', 'MAINTENANCE'] // Can bring back from retirement
  }

  // Check if transition is allowed
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return {
      isValid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
      suggestion: `Valid transitions from ${currentStatus}: ${validTransitions[currentStatus]?.join(', ') || 'none'}`
    }
  }

  // Special validations based on reservations
  if (activeReservations.length > 0) {
    if (newStatus === 'RETIRED') {
      return {
        isValid: false,
        error: 'Cannot retire item with active reservations',
        suggestion: 'Cancel or complete all reservations first',
        conflictingReservations: activeReservations
      }
    }

    if (newStatus === 'MAINTENANCE' && currentStatus === 'BORROWED') {
      return {
        isValid: false,
        error: 'Cannot move borrowed item to maintenance',
        suggestion: 'Wait for item to be returned first',
        conflictingReservations: activeReservations
      }
    }
  }

  // Validate BORROWED status can only be set if there's an active reservation
  if (newStatus === 'BORROWED') {
    const hasActiveReservation = activeReservations.some(r => r.status === 'ACTIVE')
    if (!hasActiveReservation) {
      return {
        isValid: false,
        error: 'Cannot mark item as borrowed without an active reservation',
        suggestion: 'Approve a reservation first'
      }
    }
  }

  return { 
    isValid: true,
    requiresReservationUpdate: newStatus === 'RETIRED' || newStatus === 'MAINTENANCE'
  }
}

// Helper function to handle reservation updates when status changes
async function handleReservationUpdates(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  reservations: ReservationWithUser[],
  newStatus: ItemStatus
) {
  if (newStatus === 'RETIRED' || newStatus === 'MAINTENANCE') {
    // Cancel pending reservations
    const pendingReservations = reservations.filter(r => r.status === 'PENDING')
    if (pendingReservations.length > 0) {
      await tx.reservation.updateMany({
        where: {
          id: {
            in: pendingReservations.map(r => r.id)
          }
        },
        data: {
          status: 'CANCELLED',
          rejectionReason: `Item moved to ${newStatus.toLowerCase()} status`
        }
      })
    }

    // For approved reservations, notify that item is unavailable
    const approvedReservations = reservations.filter(r => r.status === 'APPROVED')
    if (approvedReservations.length > 0) {
      await tx.reservation.updateMany({
        where: {
          id: {
            in: approvedReservations.map(r => r.id)
          }
        },
        data: {
          status: 'CANCELLED',
          rejectionReason: `Item became unavailable due to ${newStatus.toLowerCase()}`
        }
      })
    }
  }
}