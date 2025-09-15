import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/categories/suggestions
 * Get category suggestions based on search query or popular categories
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get categories that match the query
    const categories = await prisma.item.groupBy({
      by: ['category'],
      where: {
        organizationId: session.user.organizationId!,
        category: query ? {
          contains: query,
          mode: 'insensitive'
        } : undefined
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: limit
    })

    const suggestions = categories.map(cat => ({
      value: cat.category,
      label: cat.category,
      count: cat._count.category
    }))

    return NextResponse.json({
      suggestions,
      query
    })

  } catch (error) {
    console.error('Error fetching category suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}