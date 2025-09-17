import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log(session)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Build where condition
    const where: {
      userId: string
      status?: string | { lt: Date }
      endDate?: { lt: Date }
    } = {
      userId
    }
    
    if (status && status !== 'all') {
      if (status === 'overdue') {
        where.status = 'ACTIVE'
        where.endDate = {
          lt: new Date()
        }
      } else {
        where.status = status.toUpperCase()
      }
    }

    // Get user's borrowed items
    const reservations = await prisma.reservation.findMany({
      where: where as any,
      include: {
        item: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const borrowedItems = reservations.map(reservation => {
      const now = new Date()
      const dueDate = new Date(reservation.endDate)
      const borrowDate = new Date(reservation.startDate)
      
      // Calculate days remaining (can be negative for overdue)
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = reservation.status === 'ACTIVE' && dueDate < now
      const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0
      
      // Determine available actions based on status and timing
      const canExtend = reservation.status === 'ACTIVE' && !isOverdue && daysRemaining <= 7
      const canReturn = reservation.status === 'ACTIVE'
      const canCancel = ['PENDING', 'APPROVED'].includes(reservation.status)

      return {
        id: reservation.id,
        reservation: {
          id: reservation.id,
          itemId: reservation.itemId,
          userId: reservation.userId,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          actualStartDate: reservation.actualStartDate,
          actualEndDate: reservation.actualEndDate,
          status: reservation.status,
          purpose: reservation.purpose,
          approvedById: reservation.approvedById,
          approvedAt: reservation.approvedAt,
          rejectionReason: reservation.rejectionReason,
          pickupConfirmed: reservation.pickupConfirmed,
          pickupConfirmedAt: reservation.pickupConfirmedAt,
          notes: reservation.notes,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt
        },
        item: {
          id: reservation.item.id,
          name: reservation.item.name,
          description: reservation.item.description,
          category: reservation.item.category,
          tags: reservation.item.tags,
          condition: reservation.item.condition,
          status: reservation.item.status,
          location: reservation.item.location,
          serialNumber: reservation.item.serialNumber,
          qrCode: reservation.item.qrCode,
          barcode: reservation.item.barcode,
          images: reservation.item.images,
          value: reservation.item.value,
          createdById: reservation.item.createdById,
          createdAt: reservation.item.createdAt,
          updatedAt: reservation.item.updatedAt
        },
        daysRemaining,
        isOverdue,
        daysOverdue,
        canExtend,
        canReturn,
        canCancel
      }
    })

    return NextResponse.json({
      items: borrowedItems,
      total: borrowedItems.length,
      success: true
    })

  } catch (error) {
    console.error('Error fetching borrowed items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch borrowed items' },
      { status: 500 }
    )
  }
}