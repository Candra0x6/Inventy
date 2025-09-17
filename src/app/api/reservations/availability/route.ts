import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') // Format: YYYY-MM
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    // Check if item exists
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, status: true }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (item.status === 'RETIRED') {
      return NextResponse.json({
        available: false,
        reason: 'Item is no longer available',
        reservations: []
      })
    }

    // Build date filters
    let dateFilter = {}
    
    if (startDate && endDate) {
      // Check availability for specific date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      dateFilter = {
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } }
            ]
          }
        ]
      }
    } else if (month) {
      // Get all reservations for the specified month
      const [year, monthNum] = month.split('-')
      const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
      
      dateFilter = {
        OR: [
          {
            AND: [
              { startDate: { lte: monthEnd } },
              { endDate: { gte: monthStart } }
            ]
          }
        ]
      }
    }

    // Find conflicting reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        itemId,
        status: {
          in: ['PENDING', 'APPROVED', 'ACTIVE']
        },
        ...dateFilter
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
        startDate: 'asc'
      }
    })

    // If checking specific date range, determine availability
    if (startDate && endDate) {
      const available = reservations.length === 0
      
      return NextResponse.json({
        available,
        reason: available ? null : 'Item is reserved for the selected dates',
        reservations: reservations.map(r => ({
          id: r.id,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          user: {
            name: r.user.name || r.user.email,
          }
        }))
      })
    }

    // Return all reservations for calendar view
    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        status: item.status,
      },
      reservations: reservations.map(r => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        purpose: r.purpose,
        user: {
          id: r.user.id,
          name: r.user.name || r.user.email,
        }
      }))
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}