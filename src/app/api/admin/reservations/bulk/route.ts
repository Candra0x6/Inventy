import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel', 'delete']),
  reservationIds: z.array(z.string()).min(1, 'At least one reservation ID is required'),
  reason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin privileges
    if (!['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action, reservationIds, reason } = bulkActionSchema.parse(body)

    // Validate reservations exist and get current data
    const reservations = await prisma.reservation.findMany({
      where: {
        id: {
          in: reservationIds
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (reservations.length !== reservationIds.length) {
      return NextResponse.json(
        { error: 'Some reservations were not found' },
        { status: 404 }
      )
    }

    const updatedReservations: Array<{
      id: string
      status?: string
      deleted?: boolean
      user?: { id: string; name: string | null; email: string }
      item?: { id: string; name: string }
    }> = []
    const errors: string[] = []

    // Process bulk action
    switch (action) {
      case 'approve':
        // Only approve pending reservations
        const pendingReservations = reservations.filter(r => r.status === 'PENDING')
        
        if (pendingReservations.length === 0) {
          return NextResponse.json(
            { error: 'No pending reservations to approve' },
            { status: 400 }
          )
        }

        for (const reservation of pendingReservations) {
          try {
            // Check for conflicts before approving
            const conflictingReservations = await prisma.reservation.findMany({
              where: {
                id: { not: reservation.id },
                itemId: reservation.itemId,
                status: { in: ['APPROVED', 'ACTIVE'] },
                OR: [
                  {
                    AND: [
                      { startDate: { lte: reservation.endDate } },
                      { endDate: { gte: reservation.startDate } }
                    ]
                  }
                ]
              }
            })

            if (conflictingReservations.length > 0) {
              errors.push(`Cannot approve reservation ${reservation.id}: conflicts with existing reservations`)
              continue
            }

            const updated = await prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'ACTIVE',
                approvedById: session.user.id,
                approvedAt: new Date()
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
                item: { select: { id: true, name: true } }
              }
            })
            updatedReservations.push(updated)
          } catch (err) {
            console.error('Error approving reservation:', err)
            errors.push(`Failed to approve reservation ${reservation.id}`)
          }
        }
        break

      case 'reject':
        const rejectableReservations = reservations.filter(r => 
          ['PENDING', 'APPROVED'].includes(r.status)
        )

        for (const reservation of rejectableReservations) {
          try {
            const updated = await prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'REJECTED',
                rejectionReason: reason || 'Bulk rejection by admin'
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
                item: { select: { id: true, name: true } }
              }
            })
            updatedReservations.push(updated)
          } catch (err) {
            console.error('Error rejecting reservation:', err)
            errors.push(`Failed to reject reservation ${reservation.id}`)
          }
        }
        break

      case 'cancel':
        const cancellableReservations = reservations.filter(r => 
          ['PENDING', 'APPROVED'].includes(r.status)
        )

        for (const reservation of cancellableReservations) {
          try {
            const updated = await prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'CANCELLED'
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
                item: { select: { id: true, name: true } }
              }
            })
            updatedReservations.push(updated)
          } catch (err) {
            console.error('Error cancelling reservation:', err)
            errors.push(`Failed to cancel reservation ${reservation.id}`)
          }
        }
        break

      case 'delete':
        // Only super admins can delete
        if (session.user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Only super admins can delete reservations' },
            { status: 403 }
          )
        }

        const deletableReservations = reservations.filter(r => 
          ['CANCELLED', 'REJECTED', 'COMPLETED'].includes(r.status)
        )

        for (const reservation of deletableReservations) {
          try {
            await prisma.reservation.delete({
              where: { id: reservation.id }
            })
            updatedReservations.push({ id: reservation.id, deleted: true })
          } catch (err) {
            console.error('Error deleting reservation:', err)
            errors.push(`Failed to delete reservation ${reservation.id}`)
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      updated: updatedReservations.length,
      total: reservationIds.length,
      errors,
      updatedReservations
    })

  } catch (error) {
    console.error('Error performing bulk action:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}