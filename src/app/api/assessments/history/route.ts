import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ItemCondition } from '@prisma/client'

// Type definitions for assessment analytics
interface AssessmentChanges {
  returnId: string
  templateId: string
  templateName: string
  itemId: string
  itemName: string
  originalCondition: ItemCondition
  assessedCondition?: ItemCondition
  determinedCondition: ItemCondition
  overallScore: number
  calculatedPenalty: number
  finalPenalty: number
  staffRecommendation?: string
  overallNotes?: string
  assessedAt?: string
  assessedBy?: string
  detailedScores?: Record<string, unknown>[]
  additionalImages?: string[]
}

interface AssessmentAnalyticsData {
  condition: ItemCondition
  score: number
  penalty: number
  createdAt: Date
}

interface ProcessedAssessment {
  id: string
  returnId: string
  templateId: string
  templateName: string
  itemId: string
  itemName: string
  originalCondition: ItemCondition
  assessedCondition: ItemCondition
  overallScore: number
  calculatedPenalty: number
  finalPenalty: number
  staffRecommendation?: string
  overallNotes?: string
  assessedAt: string
  assessedBy: string
  assessor: {
    id: string
    name: string | null
    email: string
  } | null
  detailedScores: Record<string, unknown>[]
  additionalImages: string[]
}

interface AssessmentResponse {
  assessments: ProcessedAssessment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  analytics?: {
    summary: AssessmentSummary
    trends: AssessmentTrend[]
    conditionDistribution: Array<{
      condition: string
      count: number
      percentage: number
    }>
  }
}

interface AssessmentSummary {
  totalAssessments: number
  assessmentsByCondition: Record<ItemCondition, number>
  averageScore: number
  totalPenalties: number
  averagePenalty: number
  assessmentsByPeriod: {
    period: string
    count: number
    averageScore: number
    totalPenalties: number
  }[]
}

interface AssessmentTrend {
  period: string
  excellent: number
  good: number
  fair: number
  poor: number
  damaged: number
  averageScore: number
}

// GET /api/assessments/history - Get assessment history with analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has staff permissions for assessment analytics
    if (session.user.role !== 'MANAGER' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Access denied. Manager privileges required for assessment analytics.' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const query = {
      itemId: searchParams.get('itemId'),
      returnId: searchParams.get('returnId'),
      userId: searchParams.get('userId'),
      condition: searchParams.get('condition') as ItemCondition | null,
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      templateId: searchParams.get('templateId'),
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
      includeAnalytics: searchParams.get('analytics') === 'true',
      groupBy: searchParams.get('groupBy') || 'day', // day, week, month
    }

    // Build base filter for audit logs
    const baseFilter = {
      action: 'SUBMIT_CONDITION_ASSESSMENT',
      entityType: 'ConditionAssessment',
      ...(query.startDate && { 
        createdAt: { 
          gte: new Date(query.startDate),
          ...(query.endDate && { lte: new Date(query.endDate) })
        }
      }),
      ...(query.userId && { userId: query.userId }),
    }

    // Get assessment records with pagination
    const [assessments, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: baseFilter,
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
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.auditLog.count({ where: baseFilter })
    ])

    // Process assessments and apply additional filters
    const processedAssessments = assessments.map(assessment => {
      const changes = assessment.changes as unknown as AssessmentChanges
      return {
        id: assessment.entityId,
        returnId: changes.returnId,
        templateId: changes.templateId,
        templateName: changes.templateName,
        itemId: changes.itemId,
        itemName: changes.itemName,
        originalCondition: changes.originalCondition,
        assessedCondition: changes.assessedCondition || changes.determinedCondition,
        overallScore: changes.overallScore,
        calculatedPenalty: changes.calculatedPenalty || 0,
        finalPenalty: changes.finalPenalty || 0,
        staffRecommendation: changes.staffRecommendation,
        overallNotes: changes.overallNotes,
        assessedAt: changes.assessedAt || assessment.createdAt.toISOString(),
        assessedBy: changes.assessedBy || assessment.user?.email || 'Unknown',
        assessor: assessment.user,
        detailedScores: changes.detailedScores || [],
        additionalImages: changes.additionalImages || [],
      }
    }).filter(assessment => {
      // Apply client-side filters that can't be done in database
      if (query.itemId && !assessment.itemId.includes(query.itemId)) return false
      if (query.returnId && assessment.returnId !== query.returnId) return false
      if (query.condition && assessment.assessedCondition !== query.condition) return false
      if (query.templateId && assessment.templateId !== query.templateId) return false
      return true
    })

    const response: AssessmentResponse = {
      assessments: processedAssessments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
        hasNext: query.page < Math.ceil(totalCount / query.limit),
        hasPrevious: query.page > 1,
      }
    }

    // Include analytics if requested
    if (query.includeAnalytics) {
      // Get all assessments for analytics (not paginated)
      const allAssessments = await prisma.auditLog.findMany({
        where: baseFilter,
        orderBy: { createdAt: 'desc' },
      })

      const analyticsData: AssessmentAnalyticsData[] = allAssessments.map(assessment => {
        const changes = assessment.changes as unknown as AssessmentChanges
        return {
          condition: changes.assessedCondition || changes.determinedCondition,
          score: changes.overallScore || 0,
          penalty: changes.finalPenalty || 0,
          createdAt: assessment.createdAt,
        }
      })

      // Calculate summary statistics
      const summary: AssessmentSummary = {
        totalAssessments: analyticsData.length,
        assessmentsByCondition: {
          EXCELLENT: analyticsData.filter(a => a.condition === 'EXCELLENT').length,
          GOOD: analyticsData.filter(a => a.condition === 'GOOD').length,
          FAIR: analyticsData.filter(a => a.condition === 'FAIR').length,
          POOR: analyticsData.filter(a => a.condition === 'POOR').length,
          DAMAGED: analyticsData.filter(a => a.condition === 'DAMAGED').length,
        },
        averageScore: analyticsData.length > 0 
          ? analyticsData.reduce((sum, a) => sum + a.score, 0) / analyticsData.length 
          : 0,
        totalPenalties: analyticsData.reduce((sum, a) => sum + a.penalty, 0),
        averagePenalty: analyticsData.length > 0 
          ? analyticsData.reduce((sum, a) => sum + a.penalty, 0) / analyticsData.length 
          : 0,
        assessmentsByPeriod: []
      }

      // Group assessments by time period for trends
      const trends: AssessmentTrend[] = []
      const periodGroups = new Map()

      analyticsData.forEach(assessment => {
        const date = new Date(assessment.createdAt)
        let periodKey: string

        switch (query.groupBy) {
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            periodKey = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default: // day
            periodKey = date.toISOString().split('T')[0]
        }

        if (!periodGroups.has(periodKey)) {
          periodGroups.set(periodKey, {
            period: periodKey,
            assessments: [],
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
            damaged: 0,
          })
        }

        const group = periodGroups.get(periodKey)
        group.assessments.push(assessment)
        group[assessment.condition.toLowerCase()]++
      })

      // Convert to trends array with calculated averages
      Array.from(periodGroups.values()).forEach(group => {
        const avgScore = group.assessments.length > 0 
          ? group.assessments.reduce((sum: number, a: AssessmentAnalyticsData) => sum + a.score, 0) / group.assessments.length 
          : 0

        trends.push({
          period: group.period,
          excellent: group.excellent,
          good: group.good,
          fair: group.fair,
          poor: group.poor,
          damaged: group.damaged,
          averageScore: avgScore,
        })

        // Add to summary periods
        summary.assessmentsByPeriod.push({
          period: group.period,
          count: group.assessments.length,
          averageScore: avgScore,
          totalPenalties: group.assessments.reduce((sum: number, a: AssessmentAnalyticsData) => sum + a.penalty, 0),
        })
      })

      // Sort trends by period
      trends.sort((a, b) => a.period.localeCompare(b.period))
      summary.assessmentsByPeriod.sort((a, b) => a.period.localeCompare(b.period))

      response.analytics = {
        summary,
        trends,
        conditionDistribution: Object.entries(summary.assessmentsByCondition).map(([condition, count]) => ({
          condition,
          count,
          percentage: summary.totalAssessments > 0 ? (count / summary.totalAssessments) * 100 : 0
        }))
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Assessment history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment history' },
      { status: 500 }
    )
  }
}