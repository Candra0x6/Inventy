import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tags/suggestions
 * Get tag suggestions based on search query, popular tags, or contextual recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const context = searchParams.get('context') || 'general' // general, category, popular

    // Get all items with their tags
    const where: {
      category?: string
    } = {}

    if (category && context === 'category') {
      where.category = category
    }

    const items = await prisma.item.findMany({
      where,
      select: {
        tags: true
      }
    })

    // Collect all tags with their frequencies
    const tagCounts: Record<string, number> = {}
    items.forEach(item => {
      item.tags.forEach(tag => {
        if (!query || tag.toLowerCase().includes(query.toLowerCase())) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      })
    })

    // Convert to suggestions array and sort by frequency
    let suggestions = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        value: tag,
        label: tag,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    // If context is 'popular', prioritize tags with higher usage
    if (context === 'popular') {
      suggestions = suggestions.filter(s => s.count >= 2) // Only show tags used more than once
    }

    // Add some common/predefined tag suggestions if query is empty
    if (!query && suggestions.length < limit) {
      const commonTags = [
        'electronics', 'furniture', 'office-supplies', 'tools', 'equipment',
        'books', 'accessories', 'portable', 'valuable', 'fragile',
        'new', 'refurbished', 'vintage', 'repair-needed', 'high-demand'
      ]

      const existingTagValues = new Set(suggestions.map(s => s.value))
      
      commonTags.forEach(tag => {
        if (!existingTagValues.has(tag) && suggestions.length < limit) {
          suggestions.push({
            value: tag,
            label: tag,
            count: 0
          })
        }
      })
    }

    return NextResponse.json({
      suggestions,
      query,
      context,
      total: suggestions.length
    })

  } catch (error) {
    console.error('Error fetching tag suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}