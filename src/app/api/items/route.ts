import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ItemCondition, ItemStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') as ItemStatus | ''
    const condition = searchParams.get('condition') as ItemCondition | ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const departmentId = searchParams.get('departmentId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: {
      organizationId?: string
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        description?: { contains: string; mode: 'insensitive' }
        serialNumber?: { contains: string; mode: 'insensitive' }
      }>
      category?: string
      status?: ItemStatus
      condition?: ItemCondition
      tags?: { hasSome: string[] }
      departmentId?: string
    } = {
      organizationId: session.user.organizationId,
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Category filter
    if (category) {
      where.category = category
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Condition filter
    if (condition) {
      where.condition = condition
    }

    // Tags filter
    if (tags.length > 0) {
      where.tags = {
        hasSome: tags
      }
    }

    // Department filter
    if (departmentId) {
      where.departmentId = departmentId
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build orderBy clause
    const orderBy: {
      name?: 'asc' | 'desc'
      category?: 'asc' | 'desc'
      createdAt?: 'asc' | 'desc'
      updatedAt?: 'asc' | 'desc'
    } = {}
    if (sortBy === 'name' || sortBy === 'category' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder as 'asc' | 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    // Execute queries
    const [items, totalCount] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          _count: {
            select: {
              reservations: {
                where: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.item.count({ where })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Get unique categories and tags for filter options
    const [categories, allTags] = await Promise.all([
      prisma.item.groupBy({
        by: ['category'],
        where: {
          organizationId: session.user.organizationId,
        },
        _count: {
          category: true
        }
      }),
      prisma.item.findMany({
        where: {
          organizationId: session.user.organizationId,
        },
        select: {
          tags: true
        }
      })
    ])

    // Process tags to get unique values with counts
    const tagCounts: Record<string, number> = {}
    allTags.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    const uniqueTags = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count
    }))

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        categories: categories.map(c => ({
          category: c.category,
          count: c._count.category
        })),
        tags: uniqueTags,
        statuses: Object.values(ItemStatus),
        conditions: Object.values(ItemCondition),
      }
    })

  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create items (Manager, Super Admin, or Staff)
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      tags,
      condition,
      location,
      serialNumber,
      barcode,
      images,
      value,
      departmentId
    } = body

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Validate and sanitize tags
    const sanitizedTags = Array.isArray(tags) 
      ? tags.filter((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim().toLowerCase())
      : []

    // Remove duplicate tags
    const uniqueTags = [...new Set(sanitizedTags)]

    // Validate category format (no special characters, reasonable length)
    if (category.length > 50 || !/^[a-zA-Z0-9\s\-_]+$/.test(category)) {
      return NextResponse.json(
        { error: 'Category must be alphanumeric and less than 50 characters' },
        { status: 400 }
      )
    }

    // Create the item
    const item = await prisma.item.create({
      data: {
        name,
        description,
        category: category.trim(),
        tags: uniqueTags,
        condition: condition || 'EXCELLENT',
        status: 'AVAILABLE',
        location,
        serialNumber,
        barcode,
        images: images || [],
        value: value ? parseFloat(value) : null,
        organizationId: session.user.organizationId!,
        departmentId: departmentId || session.user.departmentId,
        createdById: session.user.id,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(item, { status: 201 })

  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
