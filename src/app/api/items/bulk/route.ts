import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/items/bulk
 * Bulk update operations for items (categories, tags, status, etc.)
 */
export async function PATCH(request: NextRequest) {
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
    const { action, itemIds, data } = body

    if (!action || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and itemIds array are required' },
        { status: 400 }
      )
    }

    // Verify all items belong to the user's organization
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        organizationId: session.user.organizationId!
      },
      select: {
        id: true,
        tags: true,
        category: true,
        status: true
      }
    })

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Some items not found or access denied' },
        { status: 404 }
      )
    }

    let results: Array<{
      itemId: string
      success: boolean
      [key: string]: unknown
    }> = []

    switch (action) {
      case 'update_category':
        if (!data.category) {
          return NextResponse.json(
            { error: 'Category is required for update_category action' },
            { status: 400 }
          )
        }
        
        await prisma.item.updateMany({
          where: {
            id: { in: itemIds },
            organizationId: session.user.organizationId!
          },
          data: { category: data.category.trim() }
        })

        results = itemIds.map(id => ({
          itemId: id,
          success: true,
          updatedCategory: data.category
        }))

        break

      case 'add_tags':
        if (!Array.isArray(data.tags) || data.tags.length === 0) {
          return NextResponse.json(
            { error: 'Tags array is required for add_tags action' },
            { status: 400 }
          )
        }

        const tagsToAdd = data.tags.map((tag: string) => tag.trim().toLowerCase())

        results = await Promise.all(
          items.map(async (item) => {
            const uniqueTags = Array.from(new Set([...item.tags, ...tagsToAdd]))
            
            await prisma.item.update({
              where: { id: item.id },
              data: { tags: uniqueTags }
            })

            return {
              itemId: item.id,
              success: true,
              addedTags: tagsToAdd,
              totalTags: uniqueTags.length
            }
          })
        )

        break

      case 'remove_tags':
        if (!Array.isArray(data.tags) || data.tags.length === 0) {
          return NextResponse.json(
            { error: 'Tags array is required for remove_tags action' },
            { status: 400 }
          )
        }

        const tagsToRemove = data.tags.map((tag: string) => tag.trim().toLowerCase())

        results = await Promise.all(
          items.map(async (item) => {
            const filteredTags = item.tags.filter(tag => !tagsToRemove.includes(tag))
            
            await prisma.item.update({
              where: { id: item.id },
              data: { tags: filteredTags }
            })

            return {
              itemId: item.id,
              success: true,
              removedTags: tagsToRemove,
              remainingTags: filteredTags.length
            }
          })
        )

        break

      case 'replace_tags':
        if (!Array.isArray(data.tags)) {
          return NextResponse.json(
            { error: 'Tags array is required for replace_tags action' },
            { status: 400 }
          )
        }

        const newTags = data.tags.map((tag: string) => tag.trim().toLowerCase()).filter((tag: string) => tag.length > 0)
        const uniqueNewTags: string[] = Array.from(new Set(newTags))

        await prisma.item.updateMany({
          where: {
            id: { in: itemIds },
            organizationId: session.user.organizationId!
          },
          data: { tags: uniqueNewTags }
        })

        results = itemIds.map(id => ({
          itemId: id,
          success: true,
          newTags: uniqueNewTags
        }))

        break

      case 'update_status':
        if (!data.status) {
          return NextResponse.json(
            { error: 'Status is required for update_status action' },
            { status: 400 }
          )
        }

        // Validate status
        const validStatuses = ['AVAILABLE', 'RESERVED', 'BORROWED', 'MAINTENANCE', 'RETIRED']
        if (!validStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          )
        }

        await prisma.item.updateMany({
          where: {
            id: { in: itemIds },
            organizationId: session.user.organizationId!
          },
          data: { status: data.status }
        })

        results = itemIds.map(id => ({
          itemId: id,
          success: true,
          updatedStatus: data.status
        }))

        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: update_category, add_tags, remove_tags, replace_tags, update_status' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      action,
      affectedItems: results.length,
      results,
      message: `Bulk ${action} completed successfully`
    })

  } catch (error) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}