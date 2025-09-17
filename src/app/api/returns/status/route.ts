import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const statusQuerySchema = z.object({
  userId: z.string().optional(),
  itemId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  includeMetrics: z.coerce.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = statusQuerySchema.parse(Object.fromEntries(searchParams))

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    // Build where clause based on permissions and filters
    const where: {
      userId?: string
      itemId?: string
      returnDate?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    // Add user filter for non-staff users
    if (!isStaff) {
      where.userId = session.user.id
    } else if (query.userId) {
      where.userId = query.userId
    }

    if (query.itemId) {
      where.itemId = query.itemId
    }

    // Add date filters
    if (query.dateFrom || query.dateTo) {
      where.returnDate = {}
      if (query.dateFrom) {
        where.returnDate.gte = new Date(query.dateFrom)
      }
      if (query.dateTo) {
        where.returnDate.lte = new Date(query.dateTo)
      }
    }

    // Get return status summary
    const [
      pendingReturns,
      processedReturns,
      overdueReturns,
      damagedReturns,
      recentActivity
    ] = await Promise.all([
      // Pending returns
      prisma.return.findMany({
        where: { ...where, status: 'PENDING' },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              condition: true,
              images: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          reservation: {
            select: {
              id: true,
              endDate: true,
              purpose: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Recently processed returns
      prisma.return.findMany({
        where: { 
          ...where, 
          status: { in: ['APPROVED', 'REJECTED'] },
          approvedAt: { not: null }
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { approvedAt: 'desc' },
        take: 10,
      }),

      // Overdue returns (items still not returned past due date)
      prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: new Date() },
          ...(isStaff ? {} : { userId: session.user.id }),
          returns: { none: {} }, // No return initiated yet
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              condition: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              trustScore: true,
            }
          }
        },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),

      // Damaged returns
      prisma.return.findMany({
        where: { ...where, status: 'DAMAGED' },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              value: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent activity (last 7 days)
      prisma.return.findMany({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          status: true,
          returnDate: true,
          penaltyApplied: true,
          penaltyAmount: true,
          createdAt: true,
          approvedAt: true,
          item: {
            select: {
              name: true,
              category: true,
            }
          },
          user: {
            select: {
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    ])

    // Calculate metrics if requested
    let metrics = null
    if (query.includeMetrics) {
      const [totalReturns, totalPenalties] = await Promise.all([
        prisma.return.count({ where }),
        prisma.return.aggregate({
          where: { ...where, penaltyApplied: true },
          _sum: { penaltyAmount: true },
          _count: { penaltyAmount: true },
        }),
      ])

      metrics = {
        totalReturns,
        pendingCount: pendingReturns.length,
        overdueCount: overdueReturns.length,
        damagedCount: damagedReturns.length,
        totalPenalties: totalPenalties._sum.penaltyAmount || 0,
        avgPenalty: totalPenalties._count.penaltyAmount > 0 
          ? (totalPenalties._sum.penaltyAmount || 0) / totalPenalties._count.penaltyAmount 
          : 0,
        returnRate: overdueReturns.length > 0 
          ? ((totalReturns - overdueReturns.length) / totalReturns * 100).toFixed(1)
          : '100.0',
      }
    }

    // Process overdue items to add days overdue
    const processedOverdueReturns = overdueReturns.map(reservation => ({
      ...reservation,
      daysOverdue: Math.ceil(
        (new Date().getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return NextResponse.json({
      summary: {
        pending: pendingReturns.length,
        overdue: overdueReturns.length,
        damaged: damagedReturns.length,
        recentActivity: recentActivity.length,
      },
      pendingReturns,
      processedReturns,
      overdueReturns: processedOverdueReturns,
      damagedReturns,
      recentActivity,
      metrics,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error fetching return status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch return status' },
      { status: 500 }
    )
  }
}