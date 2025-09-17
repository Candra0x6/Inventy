import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ItemCondition, ItemStatus } from '@prisma/client'
import { generateAndUploadBarcode } from '@/lib/server-barcode-generator'

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
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) as ItemStatus[] || []
    const condition = searchParams.get('condition') as ItemCondition | ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const available = searchParams.get('available') // Filter for available items only
    const overdue = searchParams.get('overdue') // Filter for overdue items
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        description?: { contains: string; mode: 'insensitive' }
        serialNumber?: { contains: string; mode: 'insensitive' }
      }>
      category?: string
      status?: ItemStatus | { in: ItemStatus[] }
      condition?: ItemCondition
      tags?: { hasSome: string[] }
      reservations?: {
        some: {
          status: 'ACTIVE'
          endDate?: { lt: Date }
        }
      }
    } = {}

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

    // Status filter (single or multiple)
    if (status) {
      where.status = status
    } else if (statuses.length > 0) {
      where.status = { in: statuses }
    }

    // Available items only filter
    if (available === 'true') {
      where.status = 'AVAILABLE'
    }

    // Overdue items filter
    if (overdue === 'true') {
      where.status = 'BORROWED'
      where.reservations = {
        some: {
          status: 'ACTIVE' as const,
          endDate: {
            lt: new Date()
          }
        }
      }
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
        _count: {
          category: true
        }
      }),
      prisma.item.findMany({
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
      images,
      value
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
        barcode: '', // Will be updated after barcode generation
        images: images || [],
        value: value ? parseFloat(value) : null,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Generate and upload barcode automatically
    const barcodeResult = await generateAndUploadBarcode(item.id, {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 14,
      background: '#ffffff',
      lineColor: '#000000'
    })

    // Update item with barcode information if generation was successful
    if (barcodeResult.success && barcodeResult.barcodeUrl && barcodeResult.barcodeValue) {
      const updatedItem = await prisma.item.update({
        where: { id: item.id },
        data: {
          barcode: barcodeResult.barcodeUrl,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })

      return NextResponse.json(updatedItem, { status: 201 })
    } else {
      // If barcode generation failed, log the error but still return the item
      console.error('Barcode generation failed:', barcodeResult.error)
      return NextResponse.json(item, { status: 201 })
    }

  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
