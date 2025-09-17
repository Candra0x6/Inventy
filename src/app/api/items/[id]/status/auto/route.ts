import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateItemStatusOnReservationChange, getStatusTransitionRecommendations } from '@/lib/item-status-manager'

interface RouteParams {
  params: Promise<{
    id: string
  }>
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

    const recommendations = await getStatusTransitionRecommendations(id)

    if (!recommendations.currentStatus) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(recommendations)

  } catch (error) {
    console.error('Error getting status recommendations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to trigger automatic updates (Manager, Super Admin, or Staff)
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { reservationStatus, reason } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    if (!reservationStatus) {
      return NextResponse.json({ error: 'Reservation status is required' }, { status: 400 })
    }

    const result = await updateItemStatusOnReservationChange(
      id,
      reservationStatus,
      session.user.id,
      reason
    )

    return NextResponse.json({
      message: 'Item status updated automatically',
      ...result
    })

  } catch (error) {
    console.error('Error triggering automatic status update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}