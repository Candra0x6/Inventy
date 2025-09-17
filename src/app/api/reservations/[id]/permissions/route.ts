import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
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
    const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const now = new Date()
    const startDate = new Date(reservation.startDate)
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Determine modification permissions
    const canModify = (() => {
      // Admins can always modify (with restrictions)
      if (isAdmin) {
        return ['PENDING', 'APPROVED'].includes(reservation.status)
      }
      
      // Owners can modify if:
      // 1. Status is PENDING or APPROVED
      // 2. Start date is more than 2 hours away
      if (isOwner) {
        return ['PENDING', 'APPROVED'].includes(reservation.status) && hoursUntilStart > 2
      }
      
      return false
    })()

    // Determine cancellation permissions
    const canCancel = (() => {
      // Admins can always cancel pending/approved reservations
      if (isAdmin) {
        return ['PENDING', 'APPROVED'].includes(reservation.status)
      }
      
      // Owners can cancel if status allows
      if (isOwner) {
        return ['PENDING', 'APPROVED'].includes(reservation.status)
      }
      
      return false
    })()

    // Calculate potential trust score impact for cancellation
    let cancellationImpact = 0
    let cancellationWarning = ''

    if (canCancel && isOwner && !isAdmin) {
      if (hoursUntilStart < 24 && hoursUntilStart > 0) {
        cancellationImpact = -5
        cancellationWarning = 'Late cancellation penalty: -5 trust score points'
      } else if (hoursUntilStart <= 0) {
        cancellationImpact = -10
        cancellationWarning = 'Very late cancellation penalty: -10 trust score points'
      }
    }

    // Calculate modification impact
    let modificationWarning = ''
    if (canModify && reservation.status === 'APPROVED' && isOwner && !isAdmin) {
      modificationWarning = 'Significant date changes may require re-approval'
    }

    return NextResponse.json({
      canModify,
      canCancel,
      permissions: {
        isOwner,
        isAdmin,
        userRole,
      },
      status: reservation.status,
      timing: {
        hoursUntilStart: Math.round(hoursUntilStart * 10) / 10,
        isUpcoming: hoursUntilStart > 0,
        isToday: hoursUntilStart <= 24 && hoursUntilStart > 0,
      },
      warnings: {
        cancellation: cancellationWarning,
        modification: modificationWarning,
      },
      impacts: {
        cancellationTrustScore: cancellationImpact,
      },
      restrictions: {
        modifyMinHours: isOwner && !isAdmin ? 2 : 0,
        cancelMinHours: 0,
      }
    })

  } catch (error) {
    console.error('Error checking reservation permissions:', error)
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}