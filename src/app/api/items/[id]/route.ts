import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Fetch the item with all related data
    const item = await prisma.item.findFirst({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
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
          },
          orderBy: {
            createdAt: 'desc'
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
          },
          orderBy: {
            returnDate: 'desc'
          },
          take: 5 // Only get recent returns
        },
        _count: {
          select: {
            reservations: true,
            returns: true,
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Calculate availability information
    const activeReservations = item.reservations.filter(r => r.status === 'ACTIVE')
    const pendingReservations = item.reservations.filter(r => r.status === 'PENDING')
    
    // Get next available date if item is currently borrowed
    let nextAvailableDate = null
    if (activeReservations.length > 0) {
      const currentReservation = activeReservations[0]
      nextAvailableDate = currentReservation.endDate
    }

    // Calculate usage statistics
    const completedReservations = await prisma.reservation.count({
      where: {
        itemId: id,
        status: 'COMPLETED'
      }
    })

    // Get recent activity (reservations and returns combined)
    const recentActivity = [
      ...item.reservations.map(r => ({
        type: 'reservation' as const,
        date: r.createdAt,
        status: r.status,
        user: r.user,
        details: `${r.status.toLowerCase()} reservation`
      })),
      ...item.returns.map(r => ({
        type: 'return' as const,
        date: r.returnDate,
        status: r.status,
        user: r.user,
        details: `Item returned in ${r.conditionOnReturn.toLowerCase()} condition`
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    // Enhanced item data
    const enhancedItem = {
      ...item,
      availability: {
        isAvailable: item.status === 'AVAILABLE' && activeReservations.length === 0,
        nextAvailableDate,
        activeReservations: activeReservations.length,
        pendingReservations: pendingReservations.length,
      },
      statistics: {
        totalReservations: item._count.reservations,
        completedReservations,
        totalReturns: item._count.returns,
        averageRating: null, // Could be calculated from reviews if implemented
      },
      recentActivity
    }

    return NextResponse.json(enhancedItem)

  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to edit items
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify item exists and user has access
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const {
      name,
      description,
      category,
      tags,
      condition,
      status,
      location,
      serialNumber,
      barcode,
      images,
      value,
      departmentId
    } = body

    // Update the item
    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(condition && { condition }),
        ...(status && { status }),
        ...(location !== undefined && { location }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(barcode !== undefined && { barcode }),
        ...(images && { images }),
        ...(value !== undefined && { value: value ? parseFloat(value) : null }),
        ...(departmentId !== undefined && { departmentId }),
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

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete items
    if (!['MANAGER', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify item exists and user has access
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if item has active reservations
    const activeReservations = await prisma.reservation.count({
      where: {
        itemId: id,
        status: {
          in: ['PENDING', 'APPROVED', 'ACTIVE']
        }
      }
    })

    if (activeReservations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item with active reservations' },
        { status: 400 }
      )
    }

    // Delete the item (cascading deletes will handle related records)
    await prisma.item.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Item deleted successfully' })

  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
