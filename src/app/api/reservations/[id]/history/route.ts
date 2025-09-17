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

    // Find the reservation to check permissions
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
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
    const canViewHistory = isOwner || ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!canViewHistory) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get audit logs for this reservation
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Reservation',
        entityId: id,
        action: {
          in: ['CREATE', 'UPDATE', 'MODIFY_RESERVATION', 'CANCEL_RESERVATION', 'APPROVE', 'REJECT']
        }
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
      }
    })

    // Format the history for better readability
    const history = auditLogs.map(log => {
      const changes = log.changes as Record<string, unknown>
      
      return {
        id: log.id,
        action: log.action,
        timestamp: log.createdAt,
        user: {
          name: log.user?.name || 'System',
          email: log.user?.email,
          role: log.user?.role,
        },
        changes: changes,
        description: getActionDescription(log.action, changes),
      }
    })

    return NextResponse.json({ history })

  } catch (error) {
    console.error('Error fetching reservation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation history' },
      { status: 500 }
    )
  }
}

function getActionDescription(action: string, changes: Record<string, unknown>): string {
  switch (action) {
    case 'CREATE':
      return 'Reservation created'
    
    case 'MODIFY_RESERVATION':
      const parts = []
      if (typeof changes?.previousStartDate === 'string' && typeof changes?.newStartDate === 'string') {
        parts.push(`Start date changed from ${new Date(changes.previousStartDate).toLocaleDateString()} to ${new Date(changes.newStartDate).toLocaleDateString()}`)
      }
      if (typeof changes?.previousEndDate === 'string' && typeof changes?.newEndDate === 'string') {
        parts.push(`End date changed from ${new Date(changes.previousEndDate).toLocaleDateString()} to ${new Date(changes.newEndDate).toLocaleDateString()}`)
      }
      if (changes?.statusChange && typeof changes.statusChange === 'object' && changes.statusChange !== null) {
        const statusChange = changes.statusChange as { from: string; to: string }
        parts.push(`Status changed from ${statusChange.from} to ${statusChange.to}`)
      }
      if (changes?.requiresReapproval) {
        parts.push('Re-approval required due to significant changes')
      }
      return parts.length > 0 ? parts.join('; ') : 'Reservation modified'
    
    case 'CANCEL_RESERVATION':
      let description = 'Reservation cancelled'
      if (typeof changes?.penaltyReason === 'string') {
        description += ` (${changes.penaltyReason})`
      }
      if (typeof changes?.trustScoreImpact === 'number' && changes.trustScoreImpact < 0) {
        description += ` - Trust score penalty: ${Math.abs(changes.trustScoreImpact)} points`
      }
      return description
    
    case 'APPROVE':
      return 'Reservation approved'
    
    case 'REJECT':
      return `Reservation rejected${typeof changes?.reason === 'string' ? `: ${changes.reason}` : ''}`
    
    case 'UPDATE':
      if (typeof changes?.field === 'string') {
        return `${changes.field} updated`
      }
      return 'Reservation updated'
    
    default:
      return action.toLowerCase().replace(/_/g, ' ')
  }
}