import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ItemCondition } from '@prisma/client'

// Type definitions
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

const assessmentCriteriaSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Criteria name is required'),
  description: z.string().optional(),
  weight: z.number().min(0).max(100), // Percentage weight for overall condition
  options: z.array(z.object({
    value: z.number().min(1).max(5), // 1-5 scale
    label: z.string(),
    description: z.string().optional(),
    conditionImpact: z.nativeEnum(ItemCondition),
  })).min(1, 'At least one option is required')
})

const assessmentTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
  criteria: z.array(assessmentCriteriaSchema).min(1, 'At least one criteria is required'),
  conditionThresholds: z.object({
    excellent: z.number().min(80).max(100).default(90),
    good: z.number().min(60).max(89).default(75),
    fair: z.number().min(40).max(69).default(55),
    poor: z.number().min(20).max(49).default(35),
    // Below 20 = DAMAGED
  }),
})

const querySchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

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
        { error: 'Only staff can create assessment templates' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = assessmentTemplateSchema.parse(body)

    // Validate criteria weights sum to 100%
    const totalWeight = validatedData.criteria.reduce((sum, criteria) => sum + criteria.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Criteria weights must sum to 100%' },
        { status: 400 }
      )
    }

    // Check if template name already exists for this category
    const existingTemplate = await prisma.auditLog.findFirst({
      where: {
        action: 'CREATE_ASSESSMENT_TEMPLATE',
        entityType: 'AssessmentTemplate',
        changes: {
          path: ['name'],
          equals: validatedData.name
        }
      }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Assessment template with this name already exists' },
        { status: 400 }
      )
    }

    // Create template (stored in audit log as structured data)
    const templateId = crypto.randomUUID()
    const now = new Date()

    await prisma.auditLog.create({
      data: {
        id: templateId,
        action: 'CREATE_ASSESSMENT_TEMPLATE',
        entityType: 'AssessmentTemplate',
        entityId: templateId,
        userId: session.user.id,
        changes: {
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          isActive: validatedData.isActive,
          criteria: validatedData.criteria,
          conditionThresholds: validatedData.conditionThresholds,
          createdBy: session.user.email,
          createdAt: now.toISOString(),
          version: 1,
        }
      }
    })

    return NextResponse.json({
      message: 'Assessment template created successfully',
      template: {
        id: templateId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        isActive: validatedData.isActive,
        criteria: validatedData.criteria,
        conditionThresholds: validatedData.conditionThresholds,
        createdAt: now.toISOString(),
        createdBy: session.user.email,
      }
    })

  } catch (error) {
    console.error('Error creating assessment template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create assessment template' },
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

    // Build where clause for templates
    const where: {
      action: string
      entityType: string
      changes?: {
        path: string[]
        equals?: string | boolean
      }
    } = {
      action: 'CREATE_ASSESSMENT_TEMPLATE',
      entityType: 'AssessmentTemplate',
    }

    // Get all assessment templates
    const templateLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Process and filter templates
    let templates = templateLogs.map(log => {
      const changes = log.changes as unknown as {
        name: string
        description?: string
        category: string
        isActive: boolean
        criteria: AssessmentCriteria[]
        conditionThresholds: ConditionThresholds
        createdAt: string
        createdBy: string
        version?: number
      }
      return {
        id: log.entityId,
        name: changes.name,
        description: changes.description,
        category: changes.category,
        isActive: changes.isActive,
        criteria: changes.criteria,
        conditionThresholds: changes.conditionThresholds,
        createdAt: changes.createdAt,
        createdBy: changes.createdBy,
        version: changes.version || 1,
        user: log.user,
      }
    })

    // Apply filters
    if (query.category) {
      templates = templates.filter(t => t.category === query.category)
    }

    if (query.isActive !== undefined) {
      templates = templates.filter(t => t.isActive === query.isActive)
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase()
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower)
      )
    }

    // Get categories for filtering
    const categories = [...new Set(templates.map(t => t.category))].sort()

    return NextResponse.json({
      templates,
      categories,
      total: templates.length,
    })

  } catch (error) {
    console.error('Error fetching assessment templates:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch assessment templates' },
      { status: 500 }
    )
  }
}