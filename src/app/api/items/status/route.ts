import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ItemStatus, Item, Reservation } from '@prisma/client'

type ItemWithReservations = Item & {
  reservations: Reservation[]
}

type BulkUpdateResult = {
  id: string
  name: string
  previousStatus: ItemStatus
  newStatus: ItemStatus
  updated: boolean
}

type InvalidItem = {
  id: string
  name: string
  currentStatus: ItemStatus
  error: string
  reservationCount: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update item status (Manager, Super Admin, or Staff)
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { itemIds, status, reason } = body

    // Validate inputs
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs array is required' }, { status: 400 })
    }

    if (!status || !Object.values(ItemStatus).includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required', 
        validStatuses: Object.values(ItemStatus) 
      }, { status: 400 })
    }

    if (itemIds.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 items can be updated at once' 
      }, { status: 400 })
    }

    // Fetch all items to validate ownership and get current status
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
      },
      include: {
        reservations: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] }
          }
        }
      }
    })

    if (items.length !== itemIds.length) {
      const foundIds = items.map(item => item.id)
      const missingIds = itemIds.filter(id => !foundIds.includes(id))
      return NextResponse.json({ 
        error: 'Some items not found or not accessible',
        missingIds 
      }, { status: 404 })
    }

    // Validate each item for status transition
    const validItems: ItemWithReservations[] = []
    const invalidItems: InvalidItem[] = []

    for (const item of items) {
      if (item.status === status) {
        // Skip items that already have the target status
        continue
      }

      // Check if there are conflicting reservations for certain status changes
      const hasActiveReservations = item.reservations.length > 0
      
      if ((status === 'RETIRED' || status === 'MAINTENANCE') && hasActiveReservations) {
        invalidItems.push({
          id: item.id,
          name: item.name,
          currentStatus: item.status,
          error: `Cannot change to ${status} with active reservations`,
          reservationCount: item.reservations.length
        })
        continue
      }

      validItems.push(item)
    }

    // Perform bulk update for valid items
    let updateResults: BulkUpdateResult[] = []
    
    if (validItems.length > 0) {
      updateResults = await prisma.$transaction(async (tx) => {
        // Update all valid items
        await tx.item.updateMany({
          where: {
            id: { in: validItems.map(item => item.id) }
          },
          data: {
            status,
            updatedAt: new Date()
          }
        })

        // Create audit logs for each item
        const auditLogs = validItems.map(item => ({
          action: 'BULK_UPDATE_STATUS',
          entityType: 'Item',
          entityId: item.id,
          userId: session.user.id,
          changes: {
            field: 'status',
            from: item.status,
            to: status,
            reason: reason || 'Bulk status update',
            timestamp: new Date().toISOString(),
            bulkOperation: true
          },
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }))

        await tx.auditLog.createMany({
          data: auditLogs
        })

        // Handle reservation cancellations if needed
        if (status === 'RETIRED' || status === 'MAINTENANCE') {
          const itemsWithReservations = validItems.filter(item => item.reservations.length > 0)
          
          if (itemsWithReservations.length > 0) {
            const reservationIds = itemsWithReservations
              .flatMap(item => item.reservations.map(r => r.id))

            await tx.reservation.updateMany({
              where: {
                id: { in: reservationIds }
              },
              data: {
                status: 'CANCELLED',
                rejectionReason: `Item moved to ${status.toLowerCase()} status via bulk update`
              }
            })
          }
        }

        return validItems.map(item => ({
          id: item.id,
          name: item.name,
          previousStatus: item.status,
          newStatus: status,
          updated: true
        }))
      })
    }

    const response = {
      success: true,
      message: `Successfully updated ${updateResults.length} items to ${status}`,
      results: {
        updated: updateResults,
        skipped: items.filter(item => item.status === status).map(item => ({
          id: item.id,
          name: item.name,
          reason: 'Already has target status'
        })),
        failed: invalidItems
      },
      summary: {
        total: itemIds.length,
        updated: updateResults.length,
        skipped: items.filter(item => item.status === status).length,
        failed: invalidItems.length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error bulk updating item status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get status summary for the organization
    const statusCounts = await prisma.item.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Get recent status changes
    const recentChanges = await prisma.auditLog.findMany({
      where: {
        entityType: 'Item',
        action: {
          in: ['UPDATE_STATUS', 'BULK_UPDATE_STATUS']
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
      },
      take: 20
    })

    // Get items that need attention (e.g., overdue returns)
    const overdueItems = await prisma.item.findMany({
      where: {
        status: 'BORROWED',
        reservations: {
          some: {
            status: 'ACTIVE',
            endDate: {
              lt: new Date()
            }
          }
        }
      },
      include: {
        reservations: {
          where: {
            status: 'ACTIVE'
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
      },
      take: 10
    })

    return NextResponse.json({
      statusCounts: statusCounts.reduce((acc, curr) => {
        if (curr._count && curr._count.status) {
          acc[curr.status] = curr._count.status
        }
        return acc
      }, {} as Record<ItemStatus, number>),
      availableStatuses: Object.values(ItemStatus),
      recentChanges: recentChanges.map(log => ({
        id: log.id,
        action: log.action,
        entityId: log.entityId,
        changes: log.changes,
        user: log.user,
        createdAt: log.createdAt
      })),
      overdueItems: overdueItems.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        borrower: item.reservations[0]?.user,
        dueDate: item.reservations[0]?.endDate,
        daysOverdue: item.reservations[0]?.endDate ? 
          Math.ceil((new Date().getTime() - new Date(item.reservations[0].endDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
      }))
    })

  } catch (error) {
    console.error('Error fetching status overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}