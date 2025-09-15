import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tags
 * Fetch all unique tags with usage counts and related information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const includeStats = searchParams.get('includeStats') === 'true'
    const minCount = parseInt(searchParams.get('minCount') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build where clause for filtering items
    const where: {
      organizationId: string
      category?: string
    } = {
      organizationId: session.user.organizationId!,
    }

    if (category) {
      where.category = category
    }

    // Get all items with their tags
    const items = await prisma.item.findMany({
      where,
      select: {
        tags: true,
        status: true,
        category: true
      }
    })

    // Process tags to get unique values with counts
    const tagStats: Record<string, {
      count: number
      categories: Set<string>
      statuses: Record<string, number>
    }> = {}

    items.forEach(item => {
      item.tags.forEach(tag => {
        if (search && !tag.toLowerCase().includes(search.toLowerCase())) {
          return
        }

        if (!tagStats[tag]) {
          tagStats[tag] = {
            count: 0,
            categories: new Set(),
            statuses: {}
          }
        }

        tagStats[tag].count++
        tagStats[tag].categories.add(item.category)
        tagStats[tag].statuses[item.status] = (tagStats[tag].statuses[item.status] || 0) + 1
      })
    })

    // Filter by minimum count and convert to array
    const tagsArray = Object.entries(tagStats)
      .filter(([, stats]) => stats.count >= minCount)
      .map(([tag, stats]) => ({
        name: tag,
        count: stats.count,
        categories: Array.from(stats.categories),
        ...(includeStats && {
          statusBreakdown: stats.statuses,
          categoryCount: stats.categories.size
        })
      }))
      .sort((a, b) => b.count - a.count) // Sort by usage count (most used first)
      .slice(0, limit)

    // Get popular tags (most frequently used)
    const popularTags = tagsArray.slice(0, 10)

    // Get trending tags (recently created items with these tags)
    const recentItems = await prisma.item.findMany({
      where: {
        organizationId: session.user.organizationId!,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        tags: true
      }
    })

    const recentTagCounts: Record<string, number> = {}
    recentItems.forEach(item => {
      item.tags.forEach(tag => {
        recentTagCounts[tag] = (recentTagCounts[tag] || 0) + 1
      })
    })

    const trendingTags = Object.entries(recentTagCounts)
      .map(([tag, count]) => ({ name: tag, recentCount: count }))
      .sort((a, b) => b.recentCount - a.recentCount)
      .slice(0, 10)

    return NextResponse.json({
      tags: tagsArray,
      totalTags: tagsArray.length,
      popularTags,
      trendingTags,
      stats: {
        totalUniqueCategories: new Set(items.map(i => i.category)).size,
        totalItems: items.length
      }
    })

  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tags
 * Create or manage tags (bulk operations)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission (Manager, Super Admin, or Staff)
    if (!['MANAGER', 'SUPER_ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, tags, itemIds } = body

    if (!action || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'Action and tags array are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'add_to_items':
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
          return NextResponse.json(
            { error: 'Item IDs are required for add_to_items action' },
            { status: 400 }
          )
        }

        // Add tags to specified items
        const addResults = await Promise.all(
          itemIds.map(async (itemId: string) => {
            const item = await prisma.item.findFirst({
              where: {
                id: itemId,
                organizationId: session.user.organizationId!
              }
            })

            if (!item) {
              return { itemId, success: false, error: 'Item not found' }
            }

            const uniqueTags = Array.from(new Set([...item.tags, ...tags]))
            
            await prisma.item.update({
              where: { id: itemId },
              data: { tags: uniqueTags }
            })

            return { itemId, success: true, addedTags: tags }
          })
        )

        return NextResponse.json({
          action: 'add_to_items',
          results: addResults,
          message: 'Tags added to items'
        })

      case 'remove_from_items':
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
          return NextResponse.json(
            { error: 'Item IDs are required for remove_from_items action' },
            { status: 400 }
          )
        }

        // Remove tags from specified items
        const removeResults = await Promise.all(
          itemIds.map(async (itemId: string) => {
            const item = await prisma.item.findFirst({
              where: {
                id: itemId,
                organizationId: session.user.organizationId!
              }
            })

            if (!item) {
              return { itemId, success: false, error: 'Item not found' }
            }

            const filteredTags = item.tags.filter(tag => !tags.includes(tag))
            
            await prisma.item.update({
              where: { id: itemId },
              data: { tags: filteredTags }
            })

            return { itemId, success: true, removedTags: tags }
          })
        )

        return NextResponse.json({
          action: 'remove_from_items',
          results: removeResults,
          message: 'Tags removed from items'
        })

      case 'rename_tag':
        const { oldTag, newTag } = body

        if (!oldTag || !newTag) {
          return NextResponse.json(
            { error: 'oldTag and newTag are required for rename_tag action' },
            { status: 400 }
          )
        }

        // Find all items with the old tag
        const itemsWithOldTag = await prisma.item.findMany({
          where: {
            organizationId: session.user.organizationId!,
            tags: {
              has: oldTag
            }
          }
        })

        // Update each item to replace old tag with new tag
        const renameResults = await Promise.all(
          itemsWithOldTag.map(async (item) => {
            const updatedTags = item.tags.map(tag => tag === oldTag ? newTag : tag)
            
            await prisma.item.update({
              where: { id: item.id },
              data: { tags: updatedTags }
            })

            return { itemId: item.id, success: true }
          })
        )

        return NextResponse.json({
          action: 'rename_tag',
          oldTag,
          newTag,
          affectedItems: renameResults.length,
          message: `Tag "${oldTag}" renamed to "${newTag}" across ${renameResults.length} items`
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: add_to_items, remove_from_items, rename_tag' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error managing tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tags
 * Delete tags from all items (cleanup operation)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission (Manager or Super Admin only)
    if (!['MANAGER', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tagsToDelete = searchParams.get('tags')?.split(',').filter(Boolean) || []

    if (tagsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No tags specified for deletion' },
        { status: 400 }
      )
    }

    // Find all items that have any of the tags to delete
    const itemsWithTags = await prisma.item.findMany({
      where: {
        organizationId: session.user.organizationId!,
        tags: {
          hasSome: tagsToDelete
        }
      }
    })

    // Remove the specified tags from all items
    const deleteResults = await Promise.all(
      itemsWithTags.map(async (item) => {
        const filteredTags = item.tags.filter(tag => !tagsToDelete.includes(tag))
        
        await prisma.item.update({
          where: { id: item.id },
          data: { tags: filteredTags }
        })

        return { itemId: item.id, success: true }
      })
    )

    return NextResponse.json({
      deletedTags: tagsToDelete,
      affectedItems: deleteResults.length,
      message: `Tags ${tagsToDelete.join(', ')} deleted from ${deleteResults.length} items`
    })

  } catch (error) {
    console.error('Error deleting tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}