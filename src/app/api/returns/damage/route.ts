import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const damageReportSchema = z.object({
  returnId: z.string().min(1, 'Return ID is required'),
  damageType: z.enum(['PHYSICAL', 'FUNCTIONAL', 'COSMETIC', 'MISSING_PARTS', 'OTHER']),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS']),
  description: z.string().min(10, 'Damage description must be at least 10 characters'),
  damageImages: z.array(z.string().url()).optional(),
  estimatedRepairCost: z.number().min(0).optional(),
  isRepairable: z.boolean().optional(),
  affectsUsability: z.boolean(),
  reportedByUserId: z.string().optional(), // If different from return user
  witnessDetails: z.string().optional(),
  incidentDate: z.string().datetime().optional(),
})

const getDamageReportsSchema = z.object({
  returnId: z.string().optional(),
  userId: z.string().optional(),
  itemId: z.string().optional(),
  status: z.enum(['REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED']).optional(),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS']).optional(),
  damageType: z.enum(['PHYSICAL', 'FUNCTIONAL', 'COSMETIC', 'MISSING_PARTS', 'OTHER']).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional(),
  sortBy: z.enum(['createdAt', 'severity', 'estimatedRepairCost']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// GET /api/returns/damage - Get damage reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validated = getDamageReportsSchema.parse(params)
    const { 
      returnId, 
      userId, 
      itemId, 
      status, 
      severity, 
      damageType,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = validated

    // Build filters
    const where: {
      returnId?: string;
      return?: Record<string, unknown>;
      status?: string;
      severity?: string;
      damageType?: string;
    } = {}
    if (returnId) where.returnId = returnId
    if (userId) where.return = { userId }
    if (itemId) where.return = { ...where.return, itemId }
    if (status) where.status = status
    if (severity) where.severity = severity
    if (damageType) where.damageType = damageType

    // Only admins can see all reports, users can only see their own
    if (session.user.role === 'BORROWER') {
      where.return = { ...where.return, userId: session.user.id }
    }

    const [reports, total] = await Promise.all([
      prisma.damageReport.findMany({
        where,
        include: {
          return: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  value: true,
                  images: true,
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
                }
              }
            }
          },
          reportedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.damageReport.count({ where })
    ])

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('Error fetching damage reports:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to fetch damage reports' }, { status: 500 })
  }
}

// POST /api/returns/damage - Create damage report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = damageReportSchema.parse(body)

    // Verify return exists and user has permission
    const returnRecord = await prisma.return.findUnique({
      where: { id: validated.returnId },
      include: {
        item: true,
        user: true,
        reservation: true,
      }
    })

    if (!returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    // Check if user can report damage for this return
    const canReport = 
      returnRecord.userId === session.user.id || // Original borrower
      ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role!) || // Admin staff
      validated.reportedByUserId === session.user.id // Explicit reporter

    if (!canReport) {
      return NextResponse.json({ error: 'Not authorized to report damage for this return' }, { status: 403 })
    }

    // Create damage report
    const damageReport = await prisma.damageReport.create({
      data: {
        returnId: validated.returnId,
        damageType: validated.damageType,
        severity: validated.severity,
        description: validated.description,
        damageImages: validated.damageImages || [],
        estimatedRepairCost: validated.estimatedRepairCost,
        isRepairable: validated.isRepairable,
        affectsUsability: validated.affectsUsability,
        reportedByUserId: validated.reportedByUserId || session.user.id,
        witnessDetails: validated.witnessDetails,
        incidentDate: validated.incidentDate ? new Date(validated.incidentDate) : new Date(),
        status: 'REPORTED',
      },
      include: {
        return: {
          include: {
            item: true,
            user: true,
          }
        },
        reportedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })

    // Update return status to DAMAGED if not already
    if (returnRecord.status !== 'DAMAGED') {
      await prisma.return.update({
        where: { id: validated.returnId },
        data: { status: 'DAMAGED' }
      })
    }

    // Update item condition if damage affects usability
    if (validated.affectsUsability) {
      const newCondition = validated.severity === 'TOTAL_LOSS' ? 'DAMAGED' :
                          validated.severity === 'MAJOR' ? 'POOR' :
                          validated.severity === 'MODERATE' ? 'FAIR' : returnRecord.item.condition

      await prisma.item.update({
        where: { id: returnRecord.itemId },
        data: { 
          condition: newCondition,
          status: validated.severity === 'TOTAL_LOSS' ? 'RETIRED' : returnRecord.item.status
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'DamageReport',
        entityId: damageReport.id,
        userId: session.user.id,
        changes: {
          damageReport: {
            returnId: validated.returnId,
            damageType: validated.damageType,
            severity: validated.severity,
            description: validated.description,
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      damageReport,
      message: 'Damage report created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating damage report:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create damage report' }, { status: 500 })
  }
}
