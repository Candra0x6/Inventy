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

    const userId = session.user.id

    // Get borrowing statistics
    const [
      totalBorrowed,
      activeBorrowings,
      overdueBorrowings,
      completedBorrowings,
      pendingRequests,
      totalReturns
    ] = await Promise.all([
      // Total borrowed (all time)
      prisma.reservation.count({
        where: {
          userId,
          status: {
            in: ['ACTIVE', 'COMPLETED']
          }
        }
      }),
      
      // Currently active borrowings
      prisma.reservation.count({
        where: {
          userId,
          status: 'ACTIVE'
        }
      }),
      
      // Overdue borrowings (past end date)
      prisma.reservation.count({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: {
            lt: new Date()
          }
        }
      }),
      
      // Completed borrowings
      prisma.reservation.count({
        where: {
          userId,
          status: 'COMPLETED'
        }
      }),
      
      // Pending requests
      prisma.reservation.count({
        where: {
          userId,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      }),
      
      // Total returns made
      prisma.return.count({
        where: {
          userId
        }
      })
    ])

    const stats = {
      totalBorrowed,
      activeBorrowings,
      overdueBorrowings,
      completedBorrowings,
      pendingRequests,
      totalReturns
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching borrowing stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch borrowing statistics' },
      { status: 500 }
    )
  }
}