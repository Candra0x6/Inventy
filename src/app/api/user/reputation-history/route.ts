import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = querySchema.parse(params)

    // Determine which user's reputation history to fetch
    let targetUserId = validatedParams.userId

    // If no userId provided, default to current user
    if (!targetUserId) {
      targetUserId = session.user.id
    }

    // Check permissions: users can view their own history, admins can view any
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(currentUser.role)
    
    if (targetUserId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch reputation history
    const skip = (validatedParams.page - 1) * validatedParams.limit

    const [history, totalCount] = await Promise.all([
      prisma.reputationHistory.findMany({
        where: {
          userId: targetUserId
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: validatedParams.limit,
      }),
      prisma.reputationHistory.count({
        where: {
          userId: targetUserId
        }
      })
    ])

    // Calculate reputation statistics
    const stats = await prisma.reputationHistory.aggregate({
      where: {
        userId: targetUserId
      },
      _avg: {
        change: true
      },
      _sum: {
        change: true
      },
      _count: true
    })

    const positiveChanges = await prisma.reputationHistory.count({
      where: {
        userId: targetUserId,
        change: {
          gt: 0
        }
      }
    })

    const negativeChanges = await prisma.reputationHistory.count({
      where: {
        userId: targetUserId,
        change: {
          lt: 0
        }
      }
    })

    // Get current user trust score
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { trustScore: true }
    })

    const response = {
      history,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit)
      },
      statistics: {
        currentTrustScore: user?.trustScore || 100,
        totalEntries: stats._count,
        averageChange: stats._avg.change || 0,
        totalChange: stats._sum.change || 0,
        positiveChanges,
        negativeChanges
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching reputation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reputation history' },
      { status: 500 }
    )
  }
}