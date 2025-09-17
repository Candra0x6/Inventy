import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ItemCondition } from '@prisma/client'

const assessmentResponseSchema = z.object({
  criteriaId: z.string(),
  value: z.number().min(1).max(5),
  notes: z.string().optional(),
})

const submitAssessmentSchema = z.object({
  returnId: z.string().min(1, 'Return ID is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  responses: z.array(assessmentResponseSchema).min(1, 'At least one response is required'),
  overallNotes: z.string().optional(),
  additionalImages: z.array(z.string()).optional().default([]),
  staffRecommendation: z.nativeEnum(ItemCondition).optional(),
  penaltyRecommendation: z.object({
    amount: z.number().min(0).max(100),
    reason: z.string(),
  }).optional(),
})

const querySchema = z.object({
  returnId: z.string().optional(),
  itemId: z.string().optional(),
  staffId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Type for assessment changes
interface AssessmentChanges {
  returnId: string
  templateId: string
  templateName: string
  itemId: string
  itemName: string
  originalCondition: ItemCondition
  assessedCondition: ItemCondition
  overallScore: number
  detailedScores: DetailedScore[]
  staffRecommendation?: string
  determinedCondition: ItemCondition
  penaltyRecommendation?: number
  calculatedPenalty: number
  finalPenalty: number
  overallNotes?: string
  additionalImages?: string[]
  assessedBy: string
  assessedAt: string
}
interface AssessmentCriteria {
  id: string
  name: string
  description?: string
  weight: number
  options: {
    value: number
    label: string
    description?: string
    conditionImpact: ItemCondition
  }[]
}

interface ConditionThresholds {
  excellent: number
  good: number
  fair: number
  poor: number
}

interface DetailedScore {
  criteriaId: string
  criteriaName: string
  value: number
  label: string
  weight: number
  weightedScore: number
  conditionImpact: ItemCondition
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can submit condition assessments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = submitAssessmentSchema.parse(body)

    // Get the return record
    const returnRecord = await prisma.return.findUnique({
      where: { id: validatedData.returnId },
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
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return record not found' },
        { status: 404 }
      )
    }

    // Get the assessment template
    const templateLog = await prisma.auditLog.findFirst({
      where: {
        action: 'CREATE_ASSESSMENT_TEMPLATE',
        entityType: 'AssessmentTemplate',
        entityId: validatedData.templateId,
      }
    })

    if (!templateLog) {
      return NextResponse.json(
        { error: 'Assessment template not found' },
        { status: 404 }
      )
    }

    const template = templateLog.changes as unknown as {
      name: string
      category: string
      criteria: AssessmentCriteria[]
      conditionThresholds: ConditionThresholds
    }

    // Validate that all required criteria have responses
    const requiredCriteriaIds = template.criteria.map(c => c.id)
    const providedCriteriaIds = validatedData.responses.map(r => r.criteriaId)
    const missingCriteria = requiredCriteriaIds.filter(id => !providedCriteriaIds.includes(id))

    if (missingCriteria.length > 0) {
      return NextResponse.json(
        { error: 'Missing responses for required criteria', missingCriteria },
        { status: 400 }
      )
    }

    // Calculate overall score
    let totalScore = 0
    let totalWeight = 0
    const detailedScores: DetailedScore[] = []

    for (const response of validatedData.responses) {
      const criteria = template.criteria.find(c => c.id === response.criteriaId)
      if (!criteria) {
        return NextResponse.json(
          { error: `Invalid criteria ID: ${response.criteriaId}` },
          { status: 400 }
        )
      }

      const option = criteria.options.find(o => o.value === response.value)
      if (!option) {
        return NextResponse.json(
          { error: `Invalid value ${response.value} for criteria ${criteria.name}` },
          { status: 400 }
        )
      }

      const weightedScore = (response.value / 5) * criteria.weight
      totalScore += weightedScore
      totalWeight += criteria.weight

      detailedScores.push({
        criteriaId: criteria.id,
        criteriaName: criteria.name,
        value: response.value,
        label: option.label,
        weight: criteria.weight,
        weightedScore,
        conditionImpact: option.conditionImpact,
        notes: response.notes,
      })
    }

    const overallScore = (totalScore / totalWeight) * 100

    // Determine condition based on thresholds
    let determinedCondition: ItemCondition
    if (overallScore >= template.conditionThresholds.excellent) {
      determinedCondition = 'EXCELLENT'
    } else if (overallScore >= template.conditionThresholds.good) {
      determinedCondition = 'GOOD'
    } else if (overallScore >= template.conditionThresholds.fair) {
      determinedCondition = 'FAIR'
    } else if (overallScore >= template.conditionThresholds.poor) {
      determinedCondition = 'POOR'
    } else {
      determinedCondition = 'DAMAGED'
    }

    // Use staff recommendation if provided, otherwise use calculated condition
    const finalCondition = validatedData.staffRecommendation || determinedCondition

    // Calculate condition-based penalty
    const originalCondition = returnRecord.item.condition
    const conditionDegradation = getConditionScore(originalCondition) - getConditionScore(finalCondition)
    const calculatedPenalty = Math.max(0, conditionDegradation * 5)

    // Use staff penalty recommendation if provided
    const finalPenalty = validatedData.penaltyRecommendation?.amount ?? calculatedPenalty

    const assessmentId = crypto.randomUUID()
    const now = new Date()

    // Create assessment record
    // Create assessment record
    await prisma.$transaction(async (tx) => {
      // Store assessment in audit log
      const assessmentRecord = await tx.auditLog.create({
        data: {
          id: assessmentId,
          action: 'SUBMIT_CONDITION_ASSESSMENT',
          entityType: 'ConditionAssessment',
          entityId: assessmentId,
          userId: session.user.id,
          changes: JSON.parse(JSON.stringify({
            returnId: validatedData.returnId,
            templateId: validatedData.templateId,
            templateName: template.name,
            itemId: returnRecord.itemId,
            itemName: returnRecord.item.name,
            originalCondition,
            assessedCondition: finalCondition,
            overallScore,
            detailedScores,
            staffRecommendation: validatedData.staffRecommendation,
            determinedCondition,
            penaltyRecommendation: validatedData.penaltyRecommendation,
            calculatedPenalty,
            finalPenalty,
            overallNotes: validatedData.overallNotes,
            additionalImages: validatedData.additionalImages,
            assessedBy: session.user.email,
            assessedAt: now.toISOString(),
          }))
        }
      })

      // Update return record with assessment results
      await tx.return.update({
        where: { id: validatedData.returnId },
        data: {
          conditionOnReturn: finalCondition,
          penaltyAmount: finalPenalty > 0 ? finalPenalty : null,
          penaltyApplied: finalPenalty > 0,
          penaltyReason: finalPenalty > 0 
            ? `Condition assessment penalty: ${validatedData.penaltyRecommendation?.reason || 'Condition degradation'}`
            : null,
          notes: validatedData.overallNotes ? 
            `${returnRecord.notes || ''}\n\nAssessment Notes: ${validatedData.overallNotes}`.trim() : 
            returnRecord.notes,
        }
      })

      return assessmentRecord
    })

    return NextResponse.json({
      message: 'Condition assessment submitted successfully',
      assessment: {
        id: assessmentId,
        returnId: validatedData.returnId,
        templateName: template.name,
        overallScore,
        originalCondition,
        assessedCondition: finalCondition,
        penaltyApplied: finalPenalty,
        detailedScores,
        assessedAt: now.toISOString(),
        assessedBy: session.user.email,
      }
    })

  } catch (error) {
    console.error('Error submitting assessment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    const userRole = session.user.role
    const isStaff = ['SUPER_ADMIN', 'MANAGER', 'STAFF'].includes(userRole)

    // Build where clause
    const where: {
      action: string
      entityType: string
      userId?: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {
      action: 'SUBMIT_CONDITION_ASSESSMENT',
      entityType: 'ConditionAssessment',
    }

    // Add staff filter for non-staff users
    if (!isStaff) {
      where.userId = session.user.id
    } else if (query.staffId) {
      where.userId = query.staffId
    }

    // Add date filters
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {}
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom)
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo)
      }
    }

    const skip = (query.page - 1) * query.limit

    const [assessments, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.auditLog.count({ where })
    ])

    // Process assessments
    const processedAssessments = assessments.map(assessment => {
      const changes = assessment.changes as unknown as AssessmentChanges
      return {
        id: assessment.entityId,
        returnId: changes.returnId,
        templateName: changes.templateName,
        itemName: changes.itemName,
        originalCondition: changes.originalCondition,
        assessedCondition: changes.assessedCondition,
        overallScore: changes.overallScore,
        penaltyApplied: changes.finalPenalty || 0,
        assessedAt: changes.assessedAt,
        assessedBy: changes.assessedBy,
        user: assessment.user,
        detailedScores: changes.detailedScores,
      }
    }).filter(assessment => {
      // Apply additional filters
      if (query.returnId && assessment.returnId !== query.returnId) return false
      if (query.itemId && assessment.itemName.includes(query.itemId)) return true
      return true
    })

    return NextResponse.json({
      assessments: processedAssessments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit),
      }
    })

  } catch (error) {
    console.error('Error fetching assessments:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  }
}

// Helper function to convert condition to numeric score
function getConditionScore(condition: ItemCondition): number {
  const scores = {
    EXCELLENT: 5,
    GOOD: 4,
    FAIR: 3,
    POOR: 2,
    DAMAGED: 1,
  }
  return scores[condition] || 0
}