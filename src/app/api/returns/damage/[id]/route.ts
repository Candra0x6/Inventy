import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const damageUpdateSchema = z.object({
  status: z.enum(['REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED']).optional(),
  adminNotes: z.string().optional(),
  repairCost: z.number().min(0).optional(),
  penaltyAmount: z.number().min(0).optional(),
  resolutionDate: z.string().datetime().optional(),
  resolutionNotes: z.string().optional(),
})

// GET /api/returns/damage/[id] - Get specific damage report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const damageReport = await prisma.damageReport.findUnique({
      where: { id: params.id },
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
      }
    })

    if (!damageReport) {
      return NextResponse.json({ error: 'Damage report not found' }, { status: 404 })
    }

    // Check permissions: only allow if user is owner, reporter, or admin
    const canView = 
      damageReport.return.userId === session.user.id ||
      damageReport.reportedByUserId === session.user.id ||
      ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role!)

    if (!canView) {
      return NextResponse.json({ error: 'Not authorized to view this damage report' }, { status: 403 })
    }

    return NextResponse.json({ damageReport })

  } catch (error) {
    console.error('Error fetching damage report:', error)
    return NextResponse.json({ error: 'Failed to fetch damage report' }, { status: 500 })
  }
}

// PUT /api/returns/damage/[id] - Update damage report (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update damage reports
    if (!['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role!)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validated = damageUpdateSchema.parse(body)

    const existingReport = await prisma.damageReport.findUnique({
      where: { id: params.id },
      include: {
        return: {
          include: {
            item: true,
            user: true,
          }
        }
      }
    })

    if (!existingReport) {
      return NextResponse.json({ error: 'Damage report not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      ...validated,
      updatedAt: new Date(),
    }

    // If status is being changed to APPROVED or RESOLVED, set approval details
    if (validated.status && ['APPROVED', 'RESOLVED'].includes(validated.status)) {
      updateData.approvedById = session.user.id
      updateData.approvedAt = new Date()
    }

    // If resolution date is provided, convert to Date
    if (validated.resolutionDate) {
      updateData.resolutionDate = new Date(validated.resolutionDate)
    }

    const updatedReport = await prisma.damageReport.update({
      where: { id: params.id },
      data: updateData,
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
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    })

    // If damage is approved, apply penalty to user's trust score
    if (validated.status === 'APPROVED' && validated.penaltyAmount && validated.penaltyAmount > 0) {
      const newTrustScore = Math.max(0, existingReport.return.user.trustScore - validated.penaltyAmount)
      
      await prisma.user.update({
        where: { id: existingReport.return.userId },
        data: { trustScore: newTrustScore }
      })

      // Create reputation history record
      await prisma.reputationHistory.create({
        data: {
          userId: existingReport.return.userId,
          change: -validated.penaltyAmount,
          reason: `Damage penalty: ${existingReport.description}`,
          previousScore: existingReport.return.user.trustScore,
          newScore: newTrustScore,
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'DamageReport',
        entityId: params.id,
        userId: session.user.id,
        changes: {
          previous: {
            status: existingReport.status,
            adminNotes: existingReport.adminNotes,
            repairCost: existingReport.repairCost,
            penaltyAmount: existingReport.penaltyAmount,
          },
          updated: validated
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      damageReport: updatedReport,
      message: 'Damage report updated successfully' 
    })

  } catch (error) {
    console.error('Error updating damage report:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update damage report' }, { status: 500 })
  }
}

// DELETE /api/returns/damage/[id] - Delete damage report (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admins can delete damage reports
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const existingReport = await prisma.damageReport.findUnique({
      where: { id: params.id }
    })

    if (!existingReport) {
      return NextResponse.json({ error: 'Damage report not found' }, { status: 404 })
    }

    await prisma.damageReport.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'DamageReport',
        entityId: params.id,
        userId: session.user.id,
        changes: {
          deleted: existingReport
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Damage report deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting damage report:', error)
    return NextResponse.json({ error: 'Failed to delete damage report' }, { status: 500 })
  }
}