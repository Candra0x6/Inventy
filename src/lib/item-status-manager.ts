import { prisma } from '@/lib/prisma'
import { ItemStatus, ReservationStatus } from '@prisma/client'

/**
 * Automatically updates item status based on reservation changes
 */
export async function updateItemStatusOnReservationChange(
  itemId: string,
  newReservationStatus: ReservationStatus,
  userId?: string,
  reason?: string
) {
  try {
    // Get current item and its active reservations
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'ACTIVE']
            }
          }
        }
      }
    })

    if (!item) {
      throw new Error('Item not found')
    }

    let newItemStatus: ItemStatus | null = null
    let updateReason = reason || 'Automatic status update based on reservation change'

    // Determine new item status based on reservation state
    switch (newReservationStatus) {
      case 'ACTIVE':
        // Item should be marked as BORROWED when reservation becomes active
        if (item.status !== 'BORROWED') {
          newItemStatus = 'BORROWED'
          updateReason = 'Item marked as borrowed due to active reservation'
        }
        break

      case 'COMPLETED':
      case 'CANCELLED':
        // Check if there are any other active reservations
        const otherActiveReservations = item.reservations.filter(r => 
          r.status === 'ACTIVE' || r.status === 'APPROVED'
        )
        
        if (otherActiveReservations.length === 0) {
          // No other active reservations, item should be available
          if (item.status === 'BORROWED' || item.status === 'RESERVED') {
            newItemStatus = 'AVAILABLE'
            updateReason = `Item returned to available status after reservation ${newReservationStatus.toLowerCase()}`
          }
        } else if (item.status === 'BORROWED' && otherActiveReservations.some(r => r.status === 'APPROVED')) {
          // Item is borrowed but has approved reservations waiting
          newItemStatus = 'RESERVED'
          updateReason = 'Item status changed to reserved due to pending approved reservations'
        }
        break

      case 'APPROVED':
        // Item should be marked as RESERVED when reservation is approved
        if (item.status === 'AVAILABLE') {
          newItemStatus = 'RESERVED'
          updateReason = 'Item reserved due to approved reservation'
        }
        break

      case 'REJECTED':
        // Check if there are any other active or approved reservations
        const remainingReservations = item.reservations.filter(r => 
          r.status === 'ACTIVE' || r.status === 'APPROVED'
        )
        
        if (remainingReservations.length === 0 && item.status === 'RESERVED') {
          newItemStatus = 'AVAILABLE'
          updateReason = 'Item returned to available status after reservation rejection'
        }
        break
    }

    // Update item status if needed
    if (newItemStatus && newItemStatus !== item.status) {
      await prisma.$transaction(async (tx) => {
        // Update item status
        await tx.item.update({
          where: { id: itemId },
          data: { 
            status: newItemStatus,
            updatedAt: new Date()
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'AUTO_UPDATE_STATUS',
            entityType: 'Item',
            entityId: itemId,
            userId: userId || null,
            changes: {
              field: 'status',
              from: item.status,
              to: newItemStatus,
              reason: updateReason,
              trigger: 'reservation_change',
              reservationStatus: newReservationStatus,
              timestamp: new Date().toISOString()
            }
          }
        })
      })

      return {
        success: true,
        previousStatus: item.status,
        newStatus: newItemStatus,
        reason: updateReason
      }
    }

    return {
      success: true,
      previousStatus: item.status,
      newStatus: item.status,
      reason: 'No status change required'
    }

  } catch (error) {
    console.error('Error updating item status:', error)
    throw error
  }
}

/**
 * Validates if an item status change is allowed based on current reservations
 */
export async function validateItemStatusChange(
  itemId: string,
  newStatus: ItemStatus,
  forceUpdate: boolean = false
) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      reservations: {
        where: {
          status: {
            in: ['PENDING', 'APPROVED', 'ACTIVE']
          }
        }
      }
    }
  })

  if (!item) {
    return { isValid: false, error: 'Item not found' }
  }

  if (forceUpdate) {
    return { isValid: true }
  }

  const activeReservations = item.reservations
  const hasActiveReservations = activeReservations.length > 0

  // Define validation rules
  const validations = [
    {
      condition: newStatus === 'RETIRED' && hasActiveReservations,
      error: 'Cannot retire item with active reservations',
      suggestion: 'Cancel or complete all reservations first'
    },
    {
      condition: newStatus === 'MAINTENANCE' && item.status === 'BORROWED',
      error: 'Cannot move borrowed item to maintenance',
      suggestion: 'Wait for item to be returned first'
    },
    {
      condition: newStatus === 'BORROWED' && !activeReservations.some(r => r.status === 'ACTIVE'),
      error: 'Cannot mark item as borrowed without an active reservation',
      suggestion: 'Approve a reservation first'
    }
  ]

  for (const validation of validations) {
    if (validation.condition) {
      return {
        isValid: false,
        error: validation.error,
        suggestion: validation.suggestion,
        conflictingReservations: activeReservations
      }
    }
  }

  return { isValid: true }
}

/**
 * Get status transition recommendations based on current item state
 */
export async function getStatusTransitionRecommendations(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
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
              email: true
            }
          }
        }
      }
    }
  })

  if (!item) {
    return { recommendations: [], currentStatus: null }
  }

  const recommendations = []
  const activeReservations = item.reservations.filter(r => r.status === 'ACTIVE')
  const approvedReservations = item.reservations.filter(r => r.status === 'APPROVED')
  const pendingReservations = item.reservations.filter(r => r.status === 'PENDING')

  switch (item.status) {
    case 'AVAILABLE':
      if (pendingReservations.length > 0) {
        recommendations.push({
          status: 'RESERVED' as ItemStatus,
          reason: 'Approve pending reservations',
          priority: 'medium',
          action: 'approve_reservations'
        })
      }
      recommendations.push({
        status: 'MAINTENANCE' as ItemStatus,
        reason: 'Schedule maintenance if needed',
        priority: 'low',
        action: 'schedule_maintenance'
      })
      break

    case 'RESERVED':
      if (approvedReservations.length > 0) {
        recommendations.push({
          status: 'BORROWED' as ItemStatus,
          reason: 'Mark as borrowed when picked up',
          priority: 'high',
          action: 'confirm_pickup',
          reservations: approvedReservations
        })
      }
      break

    case 'BORROWED':
      if (activeReservations.length > 0) {
        const overdueReservations = activeReservations.filter(r => 
          new Date(r.endDate) < new Date()
        )
        if (overdueReservations.length > 0) {
          recommendations.push({
            status: 'AVAILABLE' as ItemStatus,
            reason: 'Item is overdue for return',
            priority: 'high',
            action: 'process_return',
            reservations: overdueReservations
          })
        }
      }
      break

    case 'MAINTENANCE':
      recommendations.push({
        status: 'AVAILABLE' as ItemStatus,
        reason: 'Return to circulation after maintenance',
        priority: 'medium',
        action: 'complete_maintenance'
      })
      break

    case 'RETIRED':
      recommendations.push({
        status: 'AVAILABLE' as ItemStatus,
        reason: 'Restore item to active inventory',
        priority: 'low',
        action: 'restore_item'
      })
      break
  }

  return {
    currentStatus: item.status,
    recommendations,
    activeReservations: activeReservations.length,
    pendingReservations: pendingReservations.length,
    approvedReservations: approvedReservations.length
  }
}