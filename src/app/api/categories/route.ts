import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/categories
 * Fetch all unique categories with item counts and usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const includeStats = searchParams.get('includeStats') === 'true'

    // Build where clause for filtering
    const where: {
      organizationId: string
      category?: {
        contains: string
        mode: 'insensitive'
      }
    } = {
      organizationId: session.user.organizationId!,
    }

    if (search) {
      where.category = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Get categories with counts
    const categoriesWithCounts = await prisma.item.groupBy({
      by: ['category'],
      where,
      _count: {
        category: true
      },
      orderBy: {
        category: 'asc'
      }
    })

    // If detailed stats are requested, get additional information
    let categoriesWithStats = categoriesWithCounts.map(cat => ({
      name: cat.category,
      itemCount: cat._count.category,
    }))

    if (includeStats) {
      // Get additional statistics for each category
      const statsPromises = categoriesWithCounts.map(async (cat) => {
        const [availableCount, borrowedCount, reservedCount] = await Promise.all([
          prisma.item.count({
            where: {
              organizationId: session.user.organizationId!,
              category: cat.category,
              status: 'AVAILABLE'
            }
          }),
          prisma.item.count({
            where: {
              organizationId: session.user.organizationId!,
              category: cat.category,
              status: 'BORROWED'
            }
          }),
          prisma.item.count({
            where: {
              organizationId: session.user.organizationId!,
              category: cat.category,
              status: 'RESERVED'
            }
          })
        ])

        return {
          name: cat.category,
          itemCount: cat._count.category,
          availableCount,
          borrowedCount,
          reservedCount,
          utilizationRate: cat._count.category > 0 
            ? ((borrowedCount + reservedCount) / cat._count.category * 100).toFixed(1)
            : '0.0'
        }
      })

      categoriesWithStats = await Promise.all(statsPromises)
    }

    return NextResponse.json({
      categories: categoriesWithStats,
      totalCategories: categoriesWithCounts.length
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Create a new category by creating an item with that category
 * Note: Categories are created implicitly when items are created
 * This endpoint is for administrative purposes to pre-define categories
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission (Manager or Super Admin)
    if (!['MANAGER', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existingCategory = await prisma.item.findFirst({
      where: {
        organizationId: session.user.organizationId!,
        category: name
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      )
    }

    // Since categories are stored as strings in items, we'll create a placeholder item
    // that represents the category definition. This is a design choice - alternatively,
    // you could create a separate Categories table
    const categoryDefinition = {
      name: `[Category Definition] ${name}`,
      description: description || `Category definition for ${name}`,
      category: name,
      tags: ['_category_definition'],
      condition: 'EXCELLENT' as const,
      status: 'RETIRED' as const, // Mark as retired so it doesn't appear in normal listings
      organizationId: session.user.organizationId!,
      createdById: session.user.id,
    }

    await prisma.item.create({
      data: categoryDefinition
    })

    return NextResponse.json({
      name,
      description,
      message: 'Category created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}