import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

const exportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['csv', 'json']).default('csv'),
  type: z.enum(['summary', 'detailed', 'damage_reports']).default('summary'),
  userId: z.string().optional(),
  itemId: z.string().optional(),
  category: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to export analytics
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = exportQuerySchema.parse(params)

    // Calculate date range
    const now = new Date()
    const startDate = validatedParams.startDate ? new Date(validatedParams.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const endDate = validatedParams.endDate ? new Date(validatedParams.endDate) : now

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (validatedParams.userId) {
      whereClause.userId = validatedParams.userId
    }

    if (validatedParams.itemId) {
      whereClause.itemId = validatedParams.itemId
    }

    if (validatedParams.category) {
      whereClause.item = {
        category: validatedParams.category
      }
    }

    let data: any[] = []
    let filename = ''

    if (validatedParams.type === 'summary') {
      // Export summary analytics
      const [
        totalReturns,
        returnsByStatus,
        returnsByCondition,
        overdueCount,
        damageReports,
        penaltyStats
      ] = await Promise.all([
        prisma.return.count({ where: whereClause }),
        prisma.return.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true,
        }),
        prisma.return.groupBy({
          by: ['conditionOnReturn'],
          where: whereClause,
          _count: true,
        }),
        prisma.return.count({
          where: {
            ...whereClause,
            reservation: {
              endDate: {
                lt: prisma.return.fields.returnDate
              }
            }
          }
        }),
        prisma.damageReport.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          }
        }),
        prisma.return.aggregate({
          where: {
            ...whereClause,
            penaltyApplied: true,
          },
          _count: true,
          _sum: {
            penaltyAmount: true,
          },
          _avg: {
            penaltyAmount: true,
          },
        }),
      ])

      data = [
        {
          metric: 'Total Returns',
          value: totalReturns,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        },
        {
          metric: 'Overdue Returns',
          value: overdueCount,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        },
        {
          metric: 'Damage Reports',
          value: damageReports,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        },
        {
          metric: 'Penalties Applied',
          value: penaltyStats._count || 0,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        },
        {
          metric: 'Total Penalty Amount',
          value: penaltyStats._sum?.penaltyAmount || 0,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        },
        ...returnsByStatus.map(item => ({
          metric: `Returns - ${item.status}`,
          value: item._count,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        })),
        ...returnsByCondition.map(item => ({
          metric: `Condition - ${item.conditionOnReturn}`,
          value: item._count,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }))
      ]

      filename = `return-analytics-summary-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`

    } else if (validatedParams.type === 'detailed') {
      // Export detailed return data
      const returns = await prisma.return.findMany({
        where: whereClause,
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
          },
          reservation: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              purpose: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      data = returns.map(ret => ({
        returnId: ret.id,
        returnDate: ret.returnDate.toISOString(),
        status: ret.status,
        conditionOnReturn: ret.conditionOnReturn,
        itemId: ret.item.id,
        itemName: ret.item.name,
        itemCategory: ret.item.category,
        originalCondition: ret.item.condition,
        userId: ret.user.id,
        userName: ret.user.name,
        userEmail: ret.user.email,
        userTrustScore: ret.user.trustScore,
        reservationId: ret.reservation.id,
        reservationStart: ret.reservation.startDate.toISOString(),
        reservationEnd: ret.reservation.endDate.toISOString(),
        purpose: ret.reservation.purpose,
        isOverdue: ret.returnDate > ret.reservation.endDate,
        daysOverdue: ret.returnDate > ret.reservation.endDate 
          ? Math.ceil((ret.returnDate.getTime() - ret.reservation.endDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        penaltyApplied: ret.penaltyApplied,
        penaltyAmount: ret.penaltyAmount || 0,
        penaltyReason: ret.penaltyReason,
        damageReport: ret.damageReport,
        notes: ret.notes,
        createdAt: ret.createdAt.toISOString(),
      }))

      filename = `return-details-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`

    } else if (validatedParams.type === 'damage_reports') {
      // Export damage reports
      const damageReports = await prisma.damageReport.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(validatedParams.itemId && {
            return: {
              itemId: validatedParams.itemId
            }
          })
        },
        include: {
          return: {
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
            }
          },
          reportedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          approvedByUser: {
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
      })

      data = damageReports.map(report => ({
        reportId: report.id,
        damageType: report.damageType,
        severity: report.severity,
        description: report.description,
        estimatedRepairCost: report.estimatedRepairCost || 0,
        actualRepairCost: report.repairCost || 0,
        isRepairable: report.isRepairable,
        affectsUsability: report.affectsUsability,
        status: report.status,
        returnId: report.return.id,
        itemId: report.return.item.id,
        itemName: report.return.item.name,
        itemCategory: report.return.item.category,
        userId: report.return.user.id,
        userName: report.return.user.name,
        userEmail: report.return.user.email,
        reportedByUserId: report.reportedByUser.id,
        reportedByUserName: report.reportedByUser.name,
        reportedByUserEmail: report.reportedByUser.email,
        approvedByUserId: report.approvedByUser?.id,
        approvedByUserName: report.approvedByUser?.name,
        approvedByUserEmail: report.approvedByUser?.email,
        incidentDate: report.incidentDate.toISOString(),
        approvedAt: report.approvedAt?.toISOString(),
        resolutionDate: report.resolutionDate?.toISOString(),
        penaltyAmount: report.penaltyAmount || 0,
        adminNotes: report.adminNotes,
        resolutionNotes: report.resolutionNotes,
        createdAt: report.createdAt.toISOString(),
      }))

      filename = `damage-reports-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`
    }

    // Generate CSV or JSON response
    if (validatedParams.format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('No data available for export', { 
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
          }
        })
      }

      // Convert to CSV
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape quotes and wrap in quotes if contains comma or quote
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        }
      })

    } else {
      // Return JSON
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        }
      })
    }

  } catch (error) {
    console.error('Error exporting return analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    )
  }
}